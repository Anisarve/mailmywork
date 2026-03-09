// donate.js - Handle donation payment flow

document.addEventListener('DOMContentLoaded', () => {
    const amountBtns = document.querySelectorAll('.amount-btn');
    const customAmountInput = document.getElementById('customAmount');
    const donateBtn = document.getElementById('donateBtn');
    const donorEmail = document.getElementById('donorEmail');
    const donorName = document.getElementById('donorName');

    let selectedAmount = 500; // Default

    // Amount selection logic
    amountBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            amountBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedAmount = parseFloat(btn.dataset.amount);
            customAmountInput.value = '';
        });
    });

    customAmountInput.addEventListener('input', () => {
        if (customAmountInput.value) {
            amountBtns.forEach(b => b.classList.remove('active'));
            selectedAmount = parseFloat(customAmountInput.value);
        }
    });

    // Handle Donation
    donateBtn.addEventListener('click', async () => {
        const amount = customAmountInput.value ? parseFloat(customAmountInput.value) : selectedAmount;
        const email = donorEmail.value;
        const name = donorName.value || 'Anonymous';

        if (!email) {
            alert('Please enter your email address.');
            return;
        }

        if (!amount || amount < 10) {
            alert('Minimum donation amount is ₹10.');
            return;
        }

        donateBtn.disabled = true;
        donateBtn.innerText = 'Redirecting...';

        try {
            const response = await fetch('/api/donate/create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount,
                    donorEmail: email,
                    donorName: name
                })
            });

            const data = await response.json();

            if (data.success && data.checkoutUrl) {
                // Redirect to Dodo checkout
                window.location.href = data.checkoutUrl;
            } else {
                throw new Error(data.error || 'Failed to initiate payment.');
            }
        } catch (error) {
            console.error('Donation Error:', error);
            alert('Error: ' + error.message);
            donateBtn.disabled = false;
            donateBtn.innerText = 'Donate Now';
        }
    });
});
