// js/auth-page.js

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const tabButtons = document.querySelectorAll(".tab-button");
  const authForms = document.querySelectorAll(".auth-form");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const passwordStrength = document.getElementById("passwordStrength");
  const strengthFill = passwordStrength?.querySelector(".strength-fill");
  const strengthText = passwordStrength?.querySelector(".strength-text");
  const signupPassword = document.getElementById("signupPassword");
  const toggleButtons = document.querySelectorAll(".toggle-password");
  const toast = document.getElementById("toast");

  // Grab Firebase helpers from global (set by CDN script)
  const fb = window._sfFirebase || {};
  const {
    auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    db,
    collection,
    addDoc,
  } = fb;

  // ---------- Tab handling (Sign In / Sign Up) ----------

  function activateTab(tabName) {
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle("active", isActive);
    });

    authForms.forEach((form) => {
      const isActive =
        form.id === (tabName === "login" ? "loginForm" : "signupForm");
      form.classList.toggle("active", isActive);
    });
  }

  function getTabFromHash() {
    if (location.hash === "#signup") return "signup";
    return "login";
  }

  // Initial tab based on URL hash
  activateTab(getTabFromHash());

  // Change tab when clicking buttons
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = btn.dataset.tab === "signup" ? "signup" : "login";
      activateTab(tab);
      // Update hash so direct link works
      if (tab === "signup") {
        history.replaceState(null, "", "#signup");
      } else {
        history.replaceState(null, "", "#login");
      }
    });
  });

  // Also react to hash changes (if user types it)
  window.addEventListener("hashchange", () => {
    activateTab(getTabFromHash());
  });

  // ---------- Password show / hide ----------

  toggleButtons.forEach((btn) => {
    const targetId = btn.dataset.target;
    const targetInput = document.getElementById(targetId);
    if (!targetInput) return;

    const eyeOpen = btn.querySelector(".eye-open");
    const eyeClosed = btn.querySelector(".eye-closed");

    btn.addEventListener("click", () => {
      if (targetInput.type === "password") {
        targetInput.type = "text";
        if (eyeOpen) eyeOpen.style.display = "none";
        if (eyeClosed) eyeClosed.style.display = "block";
      } else {
        targetInput.type = "password";
        if (eyeOpen) eyeOpen.style.display = "block";
        if (eyeClosed) eyeClosed.style.display = "none";
      }
    });
  });

  // ---------- Password strength (signup) ----------

  function calculateStrength(pwd) {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 25;
    if (pwd.length >= 10) score += 15;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[0-9]/.test(pwd)) score += 20;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 20;
    return Math.min(score, 100);
  }

  function strengthLabel(score) {
    if (score === 0) return "Password strength";
    if (score < 40) return "Weak";
    if (score < 70) return "Medium";
    return "Strong";
  }

  if (signupPassword && strengthFill && strengthText) {
    signupPassword.addEventListener("input", (e) => {
      const value = e.target.value || "";
      const score = calculateStrength(value);
      strengthFill.style.width = `${score}%`;

      // Color shift from orange to green
      if (score < 40) {
        strengthFill.style.background =
          "linear-gradient(90deg, #F97316, #FB923C)";
      } else if (score < 70) {
        strengthFill.style.background =
          "linear-gradient(90deg, #EAB308, #22C55E)";
      } else {
        strengthFill.style.background =
          "linear-gradient(90deg, #22C55E, #16A34A)";
      }

      strengthText.textContent = strengthLabel(score);
    });
  }

  // ---------- Toast helper ----------

  function showToast(message, variant = "success") {
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = "block";
    toast.style.borderColor =
      variant === "error" ? "rgba(248,113,113,0.9)" : "rgba(34,197,94,0.8)";
    toast.style.background =
      variant === "error"
        ? "radial-gradient(circle at 0% 0%, #450A0A, #020617)"
        : "radial-gradient(circle at 0% 0%, #022C22, #020617)";

    setTimeout(() => {
      toast.style.display = "none";
    }, 2600);
  }

  // ---------- Real Firebase auth submit ----------

  function handleSubmit(form, { type }) {
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!auth || !createUserWithEmailAndPassword || !signInWithEmailAndPassword) {
        showToast("Firebase not loaded. Please refresh.", "error");
        return;
      }

      // Basic client‑side checks for signup
      if (type === "signup") {
        const pwd =
          document.getElementById("signupPassword")?.value || "";
        const confirm =
          document.getElementById("signupConfirmPassword")?.value || "";
        if (pwd !== confirm) {
          showToast("Passwords do not match.", "error");
          return;
        }
      }

      const button = form.querySelector(".btn-submit");
      const textSpan = button?.querySelector(".btn-text");
      const loader = button?.querySelector(".btn-loader");

      if (button) button.disabled = true;
      if (textSpan) textSpan.style.display = "none";
      if (loader) loader.style.display = "block";

      try {
        let userCredential;

        if (type === "login") {
          const email =
            document.getElementById("loginEmail")?.value || "";
          const password =
            document.getElementById("loginPassword")?.value || "";
          userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
          );
        } else {
          // SIGNUP FLOW
          const fullName =
            document.getElementById("signupName")?.value || "";
          const email =
            document.getElementById("signupEmail")?.value || "";
          const password =
            document.getElementById("signupPassword")?.value || "";

          userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );

          const user = userCredential.user;

          // Store display name locally
          const userName = fullName || email.split("@")[0] || "User";
          localStorage.setItem("sf_user_name", userName);
          localStorage.setItem("sf_user_uid", user.uid);

          // ✅ CREATE DEFAULT INVENTORY FOR NEW USER
          if (db && collection && addDoc) {
            try {
              const inventoryRef = await addDoc(collection(db, "inventories"), {
                name: `${userName}'s Kitchen`,
                userId: user.uid,
                createdAt: new Date().toISOString(),
                members: [],
              });
              console.log("✅ Default inventory created:", inventoryRef.id);
            } catch (invError) {
              console.error("❌ Error creating inventory:", invError);
              // Don't block signup if inventory creation fails
            }
          }
        }

        const user = userCredential.user;
        const emailNow =
          type === "login"
            ? document.getElementById("loginEmail")?.value || user.email || "User"
            : document.getElementById("signupEmail")?.value || user.email || "User";

        if (type === "login") {
          const nameFromEmail = emailNow.split("@")[0] || "User";
          localStorage.setItem("sf_user_name", nameFromEmail);
        }

        // Default inventory label for now (from Firestore later)
        localStorage.setItem("sf_inventory_name", "Home");
        localStorage.setItem("sf_user_uid", user.uid);

        if (type === "login") {
          showToast("Signed in successfully.");
        } else {
          showToast("Account created successfully.");
        }

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 600);
      } catch (err) {
        console.error(err);
        const code = err.code || "";
        let msg = "Something went wrong. Please try again.";

        if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
          msg = "Invalid email or password.";
        } else if (code === "auth/user-not-found") {
          msg = "No account found with this email.";
        } else if (code === "auth/email-already-in-use") {
          msg = "Email is already in use.";
        } else if (code === "auth/weak-password") {
          msg = "Password is too weak (minimum 6 characters).";
        }

        showToast(msg, "error");
      } finally {
        if (button) button.disabled = false;
        if (textSpan) textSpan.style.display = "inline-flex";
        if (loader) loader.style.display = "none";
      }
    });
  }

  handleSubmit(loginForm, { type: "login" });
  handleSubmit(signupForm, { type: "signup" });
});
