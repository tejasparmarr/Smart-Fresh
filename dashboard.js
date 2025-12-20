// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  // ---------- Firebase handles ----------
  const fb = window._sfFirebase || {};
  const {
    auth,
    onAuthStateChanged,
    signOut,
    db,
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    arrayUnion,
    Timestamp,
  } = fb;

  // ---------- DOM elements ----------

  // Multi-inventory selector
  const inventorySelector = document.getElementById("inventorySelector");
  const inventoryNameEl = document.getElementById("currentInventoryName");

  // Sync elements
  const syncInventoryNameEl = document.getElementById("syncInventoryName");
  const syncCopyLinkBtn = document.getElementById("syncCopyLinkBtn");
  const syncInviteLinkInput = document.getElementById("syncInviteLink");
  const syncDeviceList = document.getElementById("syncDeviceList");
  const syncRefreshBtn = document.getElementById("syncRefreshBtn");
  const syncJoinInput = document.getElementById("syncJoinInput");
  const syncJoinBtn = document.getElementById("syncJoinBtn");
  const syncQrBox = document.getElementById("syncQrBox");

  // Add Item form
  const addItemNameInput = document.getElementById("addItemName");
  const addItemQtyInput = document.getElementById("addItemQty");
  const addItemUnitSelect = document.getElementById("addItemUnit");
  const addItemCategorySelect = document.getElementById("addItemCategory");
  const addItemLocationInput = document.getElementById("addItemLocation");
  const addItemExpiryInput = document.getElementById("addItemExpiry");
  const addItemPriceInput = document.getElementById("addItemPrice");
  const addItemPricePerUnitInput = document.getElementById("addItemPricePerUnit");
  const addItemNotesInput = document.getElementById("addItemNotes");
  const addItemBtn = document.getElementById("addItemBtn");

  // Edit Item modal
  const editModal = document.getElementById("editItemModal");
  const editModalClose = document.getElementById("editModalClose");
  const editItemNameInput = document.getElementById("editItemName");
  const editItemQtyInput = document.getElementById("editItemQty");
  const editItemUnitSelect = document.getElementById("editItemUnit");
  const editItemCategorySelect = document.getElementById("editItemCategory");
  const editItemLocationInput = document.getElementById("editItemLocation");
  const editItemExpiryInput = document.getElementById("editItemExpiry");
  const editItemPriceInput = document.getElementById("editItemPrice");
  const editItemPricePerUnitInput = document.getElementById("editItemPricePerUnit");
  const editItemNotesInput = document.getElementById("editItemNotes");
  const editItemSaveBtn = document.getElementById("editItemSaveBtn");
  const editItemDeleteBtn = document.getElementById("editItemDeleteBtn");

  // Shopping elements
  const shoppingListEl = document.getElementById("shoppingList");
  const shoppingEmptyEl = document.getElementById("shoppingEmpty");
  const shopItemNameInput = document.getElementById("shopItemName");
  const shopItemQtyInput = document.getElementById("shopItemQty");
  const shopItemUnitSelect = document.getElementById("shopItemUnit");
  const shopItemPricePerUnitInput = document.getElementById("shopItemPricePerUnit");
  const shopItemCategorySelect = document.getElementById("shopItemCategory");
  const shopItemNotesInput = document.getElementById("shopItemNotes");
  const shopAddBtn = document.getElementById("shopAddBtn");
  const shopCopyBtn = document.getElementById("shopCopyBtn");
  const shopShareBtn = document.getElementById("shopShareBtn");
  const shopClearDoneBtn = document.getElementById("shopClearDoneBtn");
  const shopQuickChips = document.getElementById("shoppingQuickChips");
  const shopToBuyCountEl = document.getElementById("shopToBuyCount");
  const shopToBuyLabelEl = document.getElementById("shopToBuyLabel");
  const shopEstCostEl = document.getElementById("shopEstCost");
  const shopDoneCountEl = document.getElementById("shopDoneCount");

  // Calendar elements
  const calendarContainer = document.getElementById("calendarContainer");
  const calPrevBtn = document.getElementById("calPrevBtn");
  const calNextBtn = document.getElementById("calNextBtn");
  const calMonthLabel = document.getElementById("calMonthLabel");
  const calGrid = document.getElementById("calGrid");

  const navItems = document.querySelectorAll(".nav-item[data-view]");
  const views = document.querySelectorAll(".view");
  const quickButtons = document.querySelectorAll(".quick-btn[data-view]");
  const currentViewLabel = document.getElementById("currentViewLabel");
  const userInitialEl = document.getElementById("userInitial");
  const userNameEl = document.getElementById("userName");
  const logoutButton = document.getElementById("logoutButton");
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const sidebar = document.querySelector(".sidebar");

  // Expiry elements
  const expiryFilters = document.getElementById("expiryFilters");
  const expirySearchInput = document.getElementById("expirySearch");
  const expiryTableBody = document.getElementById("expiryTableBody");
  const expiryEmpty = document.getElementById("expiryEmpty");

  // Dashboard tiles
  const totalItemsEl = document.getElementById("totalItems");
  const totalValueEl = document.getElementById("totalValue");
  const expiringSoonEl = document.getElementById("expiringSoonCount");
  const expiredCountEl = document.getElementById("expiredCount");
  const expiredValueEl = document.getElementById("expiredValue");
  const itemsChangeEl = document.getElementById("itemsChange");
  const savingsVsWasteEl = document.getElementById("savingsVsWaste");
  const savingsPercentEl = document.getElementById("savingsPercent");
  const itemsConsumedEl = document.getElementById("itemsConsumed");
  const itemsWastedEl = document.getElementById("itemsWasted");

  // ---------- State ----------
  let userId = null;
  let currentInventoryId = null;
  let allInventories = [];
  let inventoryItems = [];
  let shoppingItems = [];
  let currentEditItemId = null;
  let calendarCurrentDate = new Date();

  // ---------- User info from localStorage ----------
  const storedName = localStorage.getItem("sf_user_name") || "User";
  if (userNameEl) userNameEl.textContent = storedName;
  if (userInitialEl) {
    const firstLetter = storedName.trim().charAt(0).toUpperCase() || "U";
    userInitialEl.textContent = firstLetter;
  }
  // ---------- Savings Summary period (global) ----------
window.dashboardSavingsPeriod = "overall";

const savingsPeriodTabs = document.getElementById("savingsPeriodTabs");

// ---------- Savings Summary period tabs ----------
if (savingsPeriodTabs) {
  savingsPeriodTabs.addEventListener("click", (event) => {
    const btn = event.target.closest(".savings-tab[data-period]");
    if (!btn) return;

    const period = btn.getAttribute("data-period") || "overall";
    window.dashboardSavingsPeriod = period;

    // Toggle active class on tabs
    savingsPeriodTabs
      .querySelectorAll(".savings-tab[data-period]")
      .forEach((b) => b.classList.toggle("active", b === btn));

    // Recalculate dashboard for this period
    updateDashboardUI();
  });
}


  // ---------- Multi-Inventory Service ----------

  async function getUserInventories(uid) {
    try {
      const qOwner = query(
        collection(db, "inventories"),
        where("userId", "==", uid)
      );
      const snapOwner = await getDocs(qOwner);
      const owned = snapOwner.docs.map((d) => ({ id: d.id, ...d.data() }));

      const allSnap = await getDocs(collection(db, "inventories"));
      const joined = allSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((inv) => {
          if (inv.userId === uid) return false;
          const members = inv.members || [];
          return members.some((m) => m && m.userId === uid);
        });

      console.log(`📦 User ${uid}: ${owned.length} owned, ${joined.length} joined`);
      return [...owned, ...joined];
    } catch (error) {
      console.error("❌ Error getting inventories:", error);
      return [];
    }
  }

  async function getActiveInventoryId(uid) {
    try {
      const userDocRef = doc(db, "userSettings", uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        return userDoc.data().activeInventoryId || null;
      }
      return null;
    } catch (error) {
      console.error("❌ Error getting active inventory ID:", error);
      return null;
    }
  }

  async function setActiveInventory(uid, invId) {
    try {
      const userDocRef = doc(db, "userSettings", uid);
      await setDoc(
        userDocRef,
        {
          activeInventoryId: invId,
          lastSwitched: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log(`✅ Active inventory set to: ${invId}`);
      return { success: true };
    } catch (error) {
      console.error("❌ Error setting active inventory:", error);
      return { success: false };
    }
  }

  async function joinInventory(uid, invId, deviceName = "Web Dashboard") {
    try {
      const invRef = doc(db, "inventories", invId);
      const invSnap = await getDoc(invRef);
      if (!invSnap.exists()) {
        return { success: false, error: "Inventory not found" };
      }

      const inventoryData = invSnap.data();
      const members = inventoryData.members || [];
      const isMember = members.some((m) => m && m.userId === uid);

      if (isMember || inventoryData.userId === uid) {
        return { success: false, error: "Already a member" };
      }

      const newMember = {
        userId: uid,
        role: "editor",
        deviceName,
        joinedAt: new Date().toISOString(),
      };

      await updateDoc(invRef, {
        members: arrayUnion(newMember),
      });

      console.log(`✅ Joined inventory: ${inventoryData.name}`);
      return { success: true, inventoryName: inventoryData.name };
    } catch (error) {
      console.error("❌ Error joining inventory:", error);
      return { success: false, error: error.message };
    }
  }

  // ---------- Inventory CRUD ----------

  async function loadInventoryItems(uid, invId) {
    try {
      const q = query(
        collection(db, "inventory"),
        where("userId", "==", uid),
        where("inventoryId", "==", invId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("❌ Error loading inventory items:", error);
      return [];
    }
  }

  async function addInventoryItem(uid, invId, data) {
    try {
      const itemObj = {
        userId: uid,
        inventoryId: invId,
        name: data.name,
        quantity: Number(data.quantity) || 1,
        unit: data.unit || "pieces",
        category: data.category || "other",
        location: data.location || "",
        expiryDate: data.expiryDate ? Timestamp.fromDate(new Date(data.expiryDate)) : null,
        price: Number(data.price) || 0,
        pricePerUnit: Number(data.pricePerUnit) || 0,
        totalPrice: Number(data.price) || 0,
        notes: data.notes || "",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "inventory"), itemObj);
      console.log("✅ Item added:", docRef.id);
      return { id: docRef.id, ...itemObj };
    } catch (error) {
      console.error("❌ Error adding item:", error);
      return null;
    }
  }

  async function updateInventoryItem(itemId, updates) {
    try {
      const docRef = doc(db, "inventory", itemId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
      console.log("✅ Item updated:", itemId);
      return true;
    } catch (error) {
      console.error("❌ Error updating item:", error);
      return false;
    }
  }

  async function deleteInventoryItem(itemId) {
    try {
      await deleteDoc(doc(db, "inventory", itemId));
      console.log("✅ Item deleted:", itemId);
      return true;
    } catch (error) {
      console.error("❌ Error deleting item:", error);
      return false;
    }
  }

  // ---------- Shopping List CRUD ----------

  async function loadShoppingItems(uid, invId) {
    try {
      const q = query(
        collection(db, "shoppingList"),
        where("userId", "==", uid),
        where("inventoryId", "==", invId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("❌ Error loading shopping items:", error);
      return [];
    }
  }

  async function addShoppingItem(uid, invId, data) {
    try {
      const itemObj = {
        userId: uid,
        inventoryId: invId,
        name: data.name,
        quantity: Number(data.quantity) || 1,
        unit: data.unit || "pieces",
        pricePerUnit: Number(data.pricePerUnit) || 0,
        totalPrice: (Number(data.quantity) || 1) * (Number(data.pricePerUnit) || 0),
        category: data.category || "other",
        notes: data.notes || "",
        purchased: false,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "shoppingList"), itemObj);
      console.log("✅ Shopping item added:", docRef.id);
      return { id: docRef.id, ...itemObj };
    } catch (error) {
      console.error("❌ Error adding shopping item:", error);
      return null;
    }
  }

  async function updateShoppingItem(itemId, updates) {
    try {
      await updateDoc(doc(db, "shoppingList", itemId), updates);
      console.log("✅ Shopping item updated:", itemId);
      return true;
    } catch (error) {
      console.error("❌ Error updating shopping item:", error);
      return false;
    }
  }

  async function deleteShoppingItem(itemId) {
    try {
      await deleteDoc(doc(db, "shoppingList", itemId));
      console.log("✅ Shopping item deleted:", itemId);
      return true;
    } catch (error) {
      console.error("❌ Error deleting shopping item:", error);
      return false;
    }
  }

// ---------- Stats Calculation with Financial Periods ----------

// helper to normalize dates safely (does NOT change any caller code)
function asDateWeb(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  return new Date(value);
}

// small helper for savings summary period
function getStartDateForSavingsPeriod(period) {
  const now = new Date();
  if (!period || period === "overall") return null;
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === "week") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  // "month" = last 30 days
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

// period is optional so old calls still work: computeInventoryStats(inventoryItems)
function computeInventoryStats(items, period = "overall") {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalItems = items.length;
  let totalValue = 0; // All items (fresh + expired)
  let expiringSoon = 0;
  let expired = 0;
  let expiredValue = 0; // Only expired items

  // NEW: fields for the Savings Summary “financial insight” view
  const startDate = getStartDateForSavingsPeriod(period);
  let freshValue = 0;          // profit = fresh items
  let periodExpiredValue = 0;  // loss = expired items in selected period
  const now = new Date();

  items.forEach((item) => {
    const qty = Number(item.quantity) || 1;
    const ppu = Number(item.pricePerUnit) || 0;
    const itemTotalValue = qty * ppu;

    // Total value includes ALL items
    totalValue += itemTotalValue;

    const expiryDate = asDateWeb(item.expiryDate);
    if (!expiryDate || isNaN(expiryDate.getTime())) return;

    const expDate = new Date(expiryDate);
    expDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      expired += 1;
      expiredValue += itemTotalValue;
    } else if (diffDays <= 7) {
      expiringSoon += 1;
    }

    // --------- financial insight logic (for Savings Summary) ---------
    const purchaseDate = asDateWeb(item.createdAt || item.purchaseDate);
    const isExpired = expiryDate < now;
    const expiredSameDay =
      expiryDate.getFullYear() === now.getFullYear() &&
      expiryDate.getMonth() === now.getMonth() &&
      expiryDate.getDate() === now.getDate();

    // OVERALL mode: all fresh items = profit, all expired = loss
    if (!startDate || period === "overall") {
      if (!isExpired) {
        freshValue += itemTotalValue;
      } else {
        periodExpiredValue += itemTotalValue;
      }
      return;
    }

    // period-specific: today / week / month
    // profit = fresh items whose purchaseDate is within the window
    if (
      !isExpired &&
      purchaseDate &&
      !isNaN(purchaseDate.getTime()) &&
      purchaseDate >= startDate
    ) {
      freshValue += itemTotalValue;
    }

    // loss = expired items whose expiryDate is within the window
    if (
      isExpired &&
      expiryDate &&
      !isNaN(expiryDate.getTime()) &&
      expiryDate >= startDate
    ) {
      if (period === "today") {
        if (expiredSameDay) periodExpiredValue += itemTotalValue;
      } else {
        periodExpiredValue += itemTotalValue;
      }
    }
  });

  // OLD behaviour for saved / percentSaved (kept compatible)
  let saved;
  let percentSaved;
  if (period === "overall") {
    saved = totalValue - expiredValue;
    percentSaved = totalValue > 0 ? Math.round((saved / totalValue) * 100) : 100;
  } else {
    // For other periods, use the financial-view interpretation
    saved = freshValue;
    if (periodExpiredValue === 0 && freshValue > 0) {
      percentSaved = 100;
    } else if (freshValue + periodExpiredValue > 0) {
      percentSaved = Math.round(
        (freshValue / (freshValue + periodExpiredValue)) * 100
      );
    } else {
      percentSaved = 0;
    }
  }

  return {
    totalItems,
    totalValue,
    expiringSoon,
    expired,
    expiredValue,
    saved,
    percentSaved,
    periodLoss: periodExpiredValue,
    periodProfit: freshValue,
  };
}

function updateDashboardUI() {
  // use global period if set; fallback to "overall"
  const stats = computeInventoryStats(
    inventoryItems,
    window.dashboardSavingsPeriod || "overall"
  );

  if (totalItemsEl) totalItemsEl.textContent = String(stats.totalItems);
  if (totalValueEl)
    totalValueEl.textContent = `₹${stats.totalValue.toLocaleString("en-IN")}`;
  if (expiringSoonEl) expiringSoonEl.textContent = String(stats.expiringSoon);
  if (expiredCountEl) expiredCountEl.textContent = String(stats.expired);
  if (expiredValueEl)
    expiredValueEl.textContent = `₹${stats.expiredValue.toLocaleString(
      "en-IN"
    )} wasted`;

  if (savingsVsWasteEl)
    savingsVsWasteEl.textContent = `₹${stats.saved.toLocaleString(
      "en-IN"
    )} / ₹${(stats.periodLoss ?? stats.expiredValue).toLocaleString(
      "en-IN"
    )}`;

  if (savingsPercentEl)
    savingsPercentEl.textContent = `${stats.percentSaved}% saved`;
  if (itemsConsumedEl)
    itemsConsumedEl.textContent = String(stats.totalItems - stats.expired);
  if (itemsWastedEl) itemsWastedEl.textContent = String(stats.expired);
  if (itemsChangeEl) itemsChangeEl.textContent = `+${stats.totalItems} items`;
}


  // ---------- Expiry Table with Click-to-Edit ----------

  function getItemStatus(item) {
    if (!item.expiryDate) return "unknown";
    const expiryDate = item.expiryDate.toDate ? item.expiryDate.toDate() : new Date(item.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return "expired";
    if (daysUntilExpiry <= 3) return "expiring";
    return "fresh";
  }

  function renderExpiryTable(range = "all", search = "") {
    if (!expiryTableBody) return;

    const today = new Date();
    let filtered = inventoryItems.filter((item) => item.expiryDate);

    filtered = filtered.filter((item) => {
      const expDate = item.expiryDate.toDate ? item.expiryDate.toDate() : new Date(item.expiryDate);
      if (!expDate || isNaN(expDate.getTime())) return false;

      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

      switch (range) {
        case "today":
          return diffDays === 0;
        case "3d":
          return diffDays >= 0 && diffDays <= 3;
        case "7d":
          return diffDays >= 0 && diffDays <= 7;
        case "30d":
          return diffDays >= 0 && diffDays <= 30;
        case "all":
        default:
          return true;
      }
    });

    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.name?.toLowerCase() || "").includes(s) ||
          (item.category?.toLowerCase() || "").includes(s) ||
          (item.location?.toLowerCase() || "").includes(s)
      );
    }

    expiryTableBody.innerHTML = "";

    if (filtered.length === 0) {
      if (expiryEmpty) expiryEmpty.style.display = "block";
      return;
    }

    if (expiryEmpty) expiryEmpty.style.display = "none";

    filtered.forEach((item) => {
      const expDate = item.expiryDate.toDate ? item.expiryDate.toDate() : new Date(item.expiryDate);
      if (!expDate || isNaN(expDate.getTime())) return;

      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      let status = "ok";
      let statusLabel = "Safe";

      if (diffDays < 0) {
        status = "critical";
        statusLabel = "Expired";
      } else if (diffDays <= 3) {
        status = "soon";
        statusLabel = "Soon";
      }

      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      tr.dataset.itemId = item.id;
      tr.innerHTML = `
        <td>${item.name || "Unknown"}</td>
        <td>${item.quantity || 1} ${item.unit || ""}</td>
        <td>${item.location || "-"}</td>
        <td>${expDate.toLocaleDateString("en-IN")}</td>
        <td><span class="expiry-status-pill ${status}">${statusLabel}</span></td>
      `;

      tr.addEventListener("click", () => {
        openEditModal(item);
      });

      expiryTableBody.appendChild(tr);
    });
  }

  if (expiryFilters) {
    expiryFilters.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        expiryFilters.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        renderExpiryTable(chip.dataset.range, expirySearchInput?.value || "");
      });
    });
  }

  if (expirySearchInput) {
    expirySearchInput.addEventListener("input", () => {
      const activeChip = expiryFilters?.querySelector(".filter-chip.active");
      renderExpiryTable(activeChip?.dataset.range || "all", expirySearchInput.value);
    });
  }

  // ---------- Edit Item Modal ----------

  function openEditModal(item) {
    if (!editModal) return;

    currentEditItemId = item.id;

    if (editItemNameInput) editItemNameInput.value = item.name || "";
    if (editItemQtyInput) editItemQtyInput.value = item.quantity || 1;
    if (editItemUnitSelect) editItemUnitSelect.value = item.unit || "pieces";
    if (editItemCategorySelect) editItemCategorySelect.value = item.category || "other";
    if (editItemLocationInput) editItemLocationInput.value = item.location || "";
    if (editItemPriceInput) editItemPriceInput.value = item.price || item.totalPrice || 0;
    if (editItemPricePerUnitInput) editItemPricePerUnitInput.value = item.pricePerUnit || 0;
    if (editItemNotesInput) editItemNotesInput.value = item.notes || "";

    if (item.expiryDate) {
      const expDate = item.expiryDate.toDate ? item.expiryDate.toDate() : new Date(item.expiryDate);
      if (editItemExpiryInput && !isNaN(expDate.getTime())) {
        editItemExpiryInput.value = expDate.toISOString().split("T")[0];
      }
    }

    editModal.style.display = "flex";
  }

  function closeEditModal() {
    if (editModal) editModal.style.display = "none";
    currentEditItemId = null;
  }

  if (editModalClose) {
    editModalClose.addEventListener("click", closeEditModal);
  }

  if (editModal) {
    editModal.addEventListener("click", (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  if (editItemSaveBtn) {
    editItemSaveBtn.addEventListener("click", async () => {
      if (!currentEditItemId) return;

      const updates = {
        name: editItemNameInput?.value || "",
        quantity: Number(editItemQtyInput?.value) || 1,
        unit: editItemUnitSelect?.value || "pieces",
        category: editItemCategorySelect?.value || "other",
        location: editItemLocationInput?.value || "",
        price: Number(editItemPriceInput?.value) || 0,
        pricePerUnit: Number(editItemPricePerUnitInput?.value) || 0,
        totalPrice: Number(editItemPriceInput?.value) || 0,
        notes: editItemNotesInput?.value || "",
      };

      if (editItemExpiryInput?.value) {
        updates.expiryDate = Timestamp.fromDate(new Date(editItemExpiryInput.value));
      }

      const success = await updateInventoryItem(currentEditItemId, updates);

      if (success) {
        const idx = inventoryItems.findIndex((i) => i.id === currentEditItemId);
        if (idx >= 0) {
          inventoryItems[idx] = { ...inventoryItems[idx], ...updates };
        }

        updateDashboardUI();
        renderExpiryTable(
          expiryFilters?.querySelector(".filter-chip.active")?.dataset.range || "all",
          expirySearchInput?.value || ""
        );
        renderCalendar();
        closeEditModal();
      }
    });
  }

  if (editItemDeleteBtn) {
    editItemDeleteBtn.addEventListener("click", async () => {
      if (!currentEditItemId) return;
      if (!confirm("Delete this item?")) return;

      const success = await deleteInventoryItem(currentEditItemId);

      if (success) {
        inventoryItems = inventoryItems.filter((i) => i.id !== currentEditItemId);
        updateDashboardUI();
        renderExpiryTable(
          expiryFilters?.querySelector(".filter-chip.active")?.dataset.range || "all",
          expirySearchInput?.value || ""
        );
        renderCalendar();
        closeEditModal();
      }
    });
  }

  // ---------- Add Item ----------

  function wireAddItemPriceCalc() {
    if (!addItemQtyInput || !addItemPriceInput || !addItemPricePerUnitInput) return;

    addItemQtyInput.addEventListener("input", () => {
      const qty = Number(addItemQtyInput.value) || 0;
      const ppu = Number(addItemPricePerUnitInput.value) || 0;
      if (ppu > 0 && qty > 0) {
        addItemPriceInput.value = (qty * ppu).toFixed(2);
      }
    });

    addItemPricePerUnitInput.addEventListener("input", () => {
      const qty = Number(addItemQtyInput.value) || 0;
      const ppu = Number(addItemPricePerUnitInput.value) || 0;
      if (ppu > 0 && qty > 0) {
        addItemPriceInput.value = (qty * ppu).toFixed(2);
      }
    });

    addItemPriceInput.addEventListener("input", () => {
      const qty = Number(addItemQtyInput.value) || 0;
      const price = Number(addItemPriceInput.value) || 0;
      if (price > 0 && qty > 0) {
        addItemPricePerUnitInput.value = (price / qty).toFixed(2);
      }
    });
  }

  wireAddItemPriceCalc();

  if (addItemBtn) {
    addItemBtn.addEventListener("click", async () => {
      if (!userId || !currentInventoryId) return;

      const name = addItemNameInput?.value.trim() || "";
      if (!name) {
        alert("Please enter item name");
        return;
      }

      const itemData = {
        name,
        quantity: Number(addItemQtyInput?.value) || 1,
        unit: addItemUnitSelect?.value || "pieces",
        category: addItemCategorySelect?.value || "other",
        location: addItemLocationInput?.value || "",
        expiryDate: addItemExpiryInput?.value || null,
        price: Number(addItemPriceInput?.value) || 0,
        pricePerUnit: Number(addItemPricePerUnitInput?.value) || 0,
        notes: addItemNotesInput?.value || "",
      };

      const newItem = await addInventoryItem(userId, currentInventoryId, itemData);

      if (newItem) {
        inventoryItems.push(newItem);
        updateDashboardUI();
        renderExpiryTable(
          expiryFilters?.querySelector(".filter-chip.active")?.dataset.range || "all",
          expirySearchInput?.value || ""
        );
        renderCalendar();

        if (addItemNameInput) addItemNameInput.value = "";
        if (addItemQtyInput) addItemQtyInput.value = "";
        if (addItemUnitSelect) addItemUnitSelect.value = "pieces";
        if (addItemCategorySelect) addItemCategorySelect.value = "other";
        if (addItemLocationInput) addItemLocationInput.value = "";
        if (addItemExpiryInput) addItemExpiryInput.value = "";
        if (addItemPriceInput) addItemPriceInput.value = "";
        if (addItemPricePerUnitInput) addItemPricePerUnitInput.value = "";
        if (addItemNotesInput) addItemNotesInput.value = "";
      }
    });
  }

  // ---------- Shopping List UI (INSTANT DELETE ON CLICK) ----------

  function renderShoppingList() {
    if (!shoppingListEl || !shoppingEmptyEl) return;

    shoppingListEl.innerHTML = "";

    if (shoppingItems.length === 0) {
      shoppingEmptyEl.style.display = "block";
      if (shopToBuyCountEl) shopToBuyCountEl.textContent = "0";
      if (shopToBuyLabelEl) shopToBuyLabelEl.textContent = "0";
      if (shopEstCostEl) shopEstCostEl.textContent = "₹0";
      if (shopDoneCountEl) shopDoneCountEl.textContent = "0";
      return;
    }

    shoppingEmptyEl.style.display = "none";

    let toBuy = 0;
    let done = 0;
    let estCost = 0;

    shoppingItems.forEach((item) => {
      const itemCost = (Number(item.quantity) || 1) * (Number(item.pricePerUnit) || 0);

      if (!item.purchased) {
        toBuy++;
        estCost += itemCost;
      } else {
        done++;
      }

      const li = document.createElement("li");
      li.className = "shopping-item" + (item.purchased ? " done" : "");
      li.dataset.id = item.id;

      li.innerHTML = `
        <div class="shopping-item-main">
          <button class="shopping-checkbox" data-action="toggle">
            <span class="shopping-checkbox-inner"></span>
          </button>
          <div class="shopping-texts">
            <span class="shopping-name">${item.name}</span>
            <span class="shopping-meta">${item.quantity} ${item.unit || ""} ${item.notes ? "• " + item.notes : ""}</span>
          </div>
        </div>
        <div class="shopping-price">
          <div class="shopping-price-main">₹${itemCost.toLocaleString("en-IN")}</div>
          <div class="shopping-price-unit">₹${item.pricePerUnit}/${item.unit || "unit"}</div>
        </div>
      `;

      shoppingListEl.appendChild(li);
    });

    if (shopToBuyCountEl) shopToBuyCountEl.textContent = String(toBuy);
    if (shopToBuyLabelEl) shopToBuyLabelEl.textContent = String(toBuy);
    if (shopEstCostEl) shopEstCostEl.textContent = `₹${estCost.toLocaleString("en-IN")}`;
    if (shopDoneCountEl) shopDoneCountEl.textContent = String(done);
  }

  if (shopAddBtn) {
    shopAddBtn.addEventListener("click", async () => {
      if (!userId || !currentInventoryId) return;

      const name = shopItemNameInput?.value.trim() || "";
      if (!name) return;

      const itemData = {
        name,
        quantity: Number(shopItemQtyInput?.value) || 1,
        unit: shopItemUnitSelect?.value || "pieces",
        pricePerUnit: Number(shopItemPricePerUnitInput?.value) || 0,
        category: shopItemCategorySelect?.value || "other",
        notes: shopItemNotesInput?.value || "",
      };

      const newItem = await addShoppingItem(userId, currentInventoryId, itemData);

      if (newItem) {
        shoppingItems.push(newItem);
        renderShoppingList();

        if (shopItemNameInput) shopItemNameInput.value = "";
        if (shopItemQtyInput) shopItemQtyInput.value = "";
        if (shopItemUnitSelect) shopItemUnitSelect.value = "pieces";
        if (shopItemPricePerUnitInput) shopItemPricePerUnitInput.value = "";
        if (shopItemCategorySelect) shopItemCategorySelect.value = "other";
        if (shopItemNotesInput) shopItemNotesInput.value = "";
      }
    });
  }

  // INSTANT DELETE on checkbox click
  if (shoppingListEl) {
    shoppingListEl.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action='toggle']");
      if (!btn) return;

      const li = btn.closest(".shopping-item");
      const id = li?.dataset.id;
      if (!id) return;

      // Mark as done visually
      li.classList.add("done");

      // DELETE from Firebase
      const success = await deleteShoppingItem(id);

      if (success) {
        shoppingItems = shoppingItems.filter((i) => i.id !== id);
        renderShoppingList();
      }
    });
  }

  if (shopClearDoneBtn) {
    shopClearDoneBtn.addEventListener("click", async () => {
      const doneItems = shoppingItems.filter((i) => i.purchased);
      for (const item of doneItems) {
        await deleteShoppingItem(item.id);
      }
      shoppingItems = shoppingItems.filter((i) => !i.purchased);
      renderShoppingList();
    });
  }

  if (shopCopyBtn) {
    shopCopyBtn.addEventListener("click", () => {
      const text = shoppingItems
        .map((i) => `${i.purchased ? "[x]" : "[ ]"} ${i.name} x${i.quantity} ${i.unit}`)
        .join("\n");
      navigator.clipboard.writeText(text || "Empty list").catch(() => {});
    });
  }

  if (shopShareBtn && navigator.share) {
    shopShareBtn.addEventListener("click", () => {
      const text = shoppingItems
        .map((i) => `${i.purchased ? "[x]" : "[ ]"} ${i.name} x${i.quantity} ${i.unit}`)
        .join("\n");
      navigator.share({ title: "Shopping List", text }).catch(() => {});
    });
  }

  if (shopQuickChips) {
    shopQuickChips.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-item]");
      if (!btn || !shopItemNameInput) return;
      shopItemNameInput.value = btn.dataset.item || "";
      shopItemNameInput.focus();
    });
  }

  // ---------- Calendar with Date Click Popup ----------

  function getItemsForDate(items, date) {
    return items
      .filter((item) => {
        if (!item.expiryDate) return false;
        const expiryDate = item.expiryDate.toDate
          ? item.expiryDate.toDate()
          : new Date(item.expiryDate);
        return (
          expiryDate.getDate() === date.getDate() &&
          expiryDate.getMonth() === date.getMonth() &&
          expiryDate.getFullYear() === date.getFullYear()
        );
      })
      .map((item) => ({ ...item, status: getItemStatus(item) }));
  }

  function renderCalendar() {
    if (!calGrid || !calMonthLabel) return;

    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    calMonthLabel.textContent = calendarCurrentDate.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

    calGrid.innerHTML = "";

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    dayNames.forEach((name) => {
      const header = document.createElement("div");
      header.className = "cal-day-header";
      header.textContent = name;
      calGrid.appendChild(header);
    });

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      empty.className = "cal-cell empty";
      calGrid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const dateItems = getItemsForDate(inventoryItems, cellDate);

      const cell = document.createElement("div");
      cell.className = "cal-cell";

      const num = document.createElement("div");
      num.className = "cal-day-number";
      num.textContent = String(day);
      cell.appendChild(num);

      if (dateItems.length) {
        const dots = document.createElement("div");
        dots.className = "cal-dots";

        const maxDots = Math.min(3, dateItems.length);
        for (let i = 0; i < maxDots; i++) {
          const dot = document.createElement("span");
          dot.className = "cal-dot " + dateItems[i].status;
          dots.appendChild(dot);
        }

        if (dateItems.length > 3) {
          const more = document.createElement("span");
          more.className = "cal-more";
          more.textContent = `+${dateItems.length - 3}`;
          dots.appendChild(more);
        }

        cell.appendChild(dots);

        // Click handler: show popup
        cell.addEventListener("click", () => {
          showCalendarDatePopup(cellDate, dateItems);
        });
      }

      calGrid.appendChild(cell);
    }
  }

  // Calendar Date Popup
  function showCalendarDatePopup(date, items) {
    // Create modal
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.style.display = "flex";

    const content = document.createElement("div");
    content.className = "modal-content";

    const header = document.createElement("div");
    header.className = "modal-header";

    const title = document.createElement("h3");
    title.textContent = date.toLocaleDateString("en-IN", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    header.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(modal);
    });
    header.appendChild(closeBtn);

    content.appendChild(header);

    const body = document.createElement("div");
    body.style.paddingTop = "10px";

    const subtitle = document.createElement("p");
    subtitle.textContent = `${items.length} item${items.length > 1 ? "s" : ""} expiring`;
    subtitle.style.fontSize = "12px";
    subtitle.style.color = "rgba(148,163,184,0.95)";
    subtitle.style.marginBottom = "12px";
    body.appendChild(subtitle);

    items.forEach((item) => {
      const itemCard = document.createElement("div");
      itemCard.style.cssText = `
        border-radius: 14px;
        padding: 10px 12px;
        background: rgba(15,23,42,0.95);
        border: 1px solid rgba(55,65,81,0.95);
        margin-bottom: 8px;
        cursor: pointer;
        transition: border-color 160ms ease-out;
      `;

      itemCard.addEventListener("mouseenter", () => {
        itemCard.style.borderColor = "rgba(34,197,94,0.7)";
      });
      itemCard.addEventListener("mouseleave", () => {
        itemCard.style.borderColor = "rgba(55,65,81,0.95)";
      });

      itemCard.addEventListener("click", () => {
        document.body.removeChild(modal);
        openEditModal(item);
      });

      const itemName = document.createElement("div");
      itemName.textContent = item.name || "Unknown";
      itemName.style.fontSize = "14px";
      itemName.style.fontWeight = "600";
      itemCard.appendChild(itemName);

      const itemMeta = document.createElement("div");
      itemMeta.textContent = `${item.category || "other"} • ${item.quantity || 1} ${item.unit || "pieces"}`;
      itemMeta.style.fontSize = "11px";
      itemMeta.style.color = "rgba(148,163,184,0.95)";
      itemMeta.style.marginTop = "2px";
      itemCard.appendChild(itemMeta);

      const itemStatus = document.createElement("div");
      itemStatus.style.marginTop = "6px";
      const statusPill = document.createElement("span");
      statusPill.className = `expiry-status-pill ${item.status === "expired" ? "critical" : item.status === "expiring" ? "soon" : "ok"}`;
      statusPill.textContent = item.status === "expired" ? "Expired" : item.status === "expiring" ? "Soon" : "Fresh";
      itemStatus.appendChild(statusPill);
      itemCard.appendChild(itemStatus);

      body.appendChild(itemCard);
    });

    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  if (calPrevBtn) {
    calPrevBtn.addEventListener("click", () => {
      calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
      renderCalendar();
    });
  }

  if (calNextBtn) {
    calNextBtn.addEventListener("click", () => {
      calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
      renderCalendar();
    });
  }

  // ---------- Sync Page (COPY TO CLIPBOARD FIX) ----------

  async function renderSyncPage() {
    if (!currentInventoryId || !syncInventoryNameEl) return;

    const invDoc = await getDoc(doc(db, "inventories", currentInventoryId));
    if (!invDoc.exists()) return;

    const invData = invDoc.data();
    syncInventoryNameEl.textContent = invData.name || "Unknown";

    if (syncInviteLinkInput) {
      syncInviteLinkInput.value = currentInventoryId;
    }

    if (syncQrBox && window.QRCode) {
      syncQrBox.innerHTML = "";
      new QRCode(syncQrBox, {
        text: currentInventoryId,
        width: 200,
        height: 200,
      });
    }

    if (syncDeviceList) {
      syncDeviceList.innerHTML = "";
      const members = invData.members || [];

      if (members.length === 0) {
        syncDeviceList.innerHTML = "<li style='padding:10px; text-align:center; font-size:11px; color:rgba(148,163,184,0.9);'>No devices connected</li>";
        return;
      }

      members.forEach((member) => {
        const li = document.createElement("li");
        li.className = "sync-device-item";
        li.innerHTML = `
          <div class="sync-device-main">
            <div class="sync-device-avatar">${(member.deviceName || "?").charAt(0).toUpperCase()}</div>
            <div class="sync-device-texts">
              <span class="sync-device-name">${member.deviceName || "Unknown"}</span>
              <span class="sync-device-meta">${member.role || "member"} • Joined ${new Date(member.joinedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div class="sync-device-status">Online</div>
        `;
        syncDeviceList.appendChild(li);
      });
    }
  }

  // COPY TO CLIPBOARD (FIXED)
  if (syncCopyLinkBtn && syncInviteLinkInput) {
    syncCopyLinkBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(syncInviteLinkInput.value)
        .then(() => {
          syncCopyLinkBtn.textContent = "Copied!";
          setTimeout(() => {
            syncCopyLinkBtn.textContent = "Copy";
          }, 2000);
        })
        .catch(() => {
          alert("Failed to copy");
        });
    });
  }

  if (syncJoinBtn && syncJoinInput) {
    syncJoinBtn.addEventListener("click", async () => {
      const code = syncJoinInput.value.trim();
      if (!code || !userId) return;

      const result = await joinInventory(userId, code);
      if (result.success) {
        alert(`Joined ${result.inventoryName}!`);
        allInventories = await getUserInventories(userId);
        setupInventorySelector();
      } else {
        alert(result.error || "Failed to join");
      }
    });
  }

  if (syncRefreshBtn) {
    syncRefreshBtn.addEventListener("click", () => {
      renderSyncPage();
    });
  }

  // ---------- Multi-Inventory Switching ----------

  async function selectInventory(invId) {
    currentInventoryId = invId;
    const inv = allInventories.find((i) => i.id === invId);

    if (inventoryNameEl && inv) {
      inventoryNameEl.textContent = inv.name || "Unknown";
    }

    inventoryItems = await loadInventoryItems(userId, invId);
    shoppingItems = await loadShoppingItems(userId, invId);

    updateDashboardUI();
    renderExpiryTable("all", "");
    renderShoppingList();
    renderCalendar();
    renderSyncPage();

    await setActiveInventory(userId, invId);
  }

  function setupInventorySelector() {
    if (!inventorySelector) return;

    inventorySelector.innerHTML = "";
    allInventories.forEach((inv) => {
      const opt = document.createElement("option");
      opt.value = inv.id;
      opt.textContent = inv.name || "Unnamed";
      if (inv.id === currentInventoryId) opt.selected = true;
      inventorySelector.appendChild(opt);
    });

    inventorySelector.style.display = allInventories.length > 1 ? "inline-block" : "none";

    inventorySelector.onchange = (e) => {
      selectInventory(e.target.value);
    };
  }

  // ---------- Navigation ----------

  function switchView(viewId) {
    views.forEach((v) => v.classList.remove("active"));
    navItems.forEach((n) => n.classList.remove("active"));

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.add("active");

    const targetNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (targetNav) targetNav.classList.add("active");

    const viewLabels = {
      dashboard: "Dashboard",
      expiry: "Expiry",
      shopping: "Shopping List",
      sync: "Sync",
    };
    if (currentViewLabel) currentViewLabel.textContent = viewLabels[viewId] || "Dashboard";

    if (sidebar) sidebar.classList.remove("open");
  }

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const viewId = item.dataset.view;
      if (viewId) switchView(viewId);
    });
  });

  quickButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const viewId = btn.dataset.view;
      if (viewId) switchView(viewId);
    });
  });

  if (mobileMenuToggle && sidebar) {
    mobileMenuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      if (!confirm("Logout?")) return;
      await signOut(auth);
      window.location.href = "login.html#login";
    });
  }

  // ---------- Auth + Init ----------

  if (auth && onAuthStateChanged) {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "login.html#login";
        return;
      }

      userId = user.uid;
      localStorage.setItem("sf_user_uid", userId);

      allInventories = await getUserInventories(userId);

      if (allInventories.length === 0) {
        alert("No inventories found. Please create one on the mobile app first.");
        return;
      }

      let activeInvId = await getActiveInventoryId(userId);
      if (!activeInvId || !allInventories.find((i) => i.id === activeInvId)) {
        activeInvId = allInventories[0].id;
      }

      await selectInventory(activeInvId);
      setupInventorySelector();
    });
  }
});
