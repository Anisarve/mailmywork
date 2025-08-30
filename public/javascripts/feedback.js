
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".feedback-form");
  const nameInput = form.querySelector("input[type='text']");
  const emailInput = form.querySelector("input[type='email']");
  const messageInput = form.querySelector("textarea");
  const submitBtn = form.querySelector(".submit-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Disable button & show sending state
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    const payload = {
      username: nameInput.value.trim(),
      useremail: emailInput.value.trim(),
      feedback: messageInput.value.trim(),
    };

    try {
      const response = await fetch("/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        submitBtn.textContent = "Feedback Sent!";
        form.reset();
      } else {
        const errorData = await response.json().catch(() => ({}));
        submitBtn.textContent = `Error: ${errorData.message || "Failed"}`;
      }
    } catch (error) {
      submitBtn.textContent = "Network Error";
    }

    // Re-enable button after 3s with default text
    setTimeout(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Message";
    }, 3000);
  });
});
