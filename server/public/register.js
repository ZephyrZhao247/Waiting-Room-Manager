const form = document.getElementById('registration-form');
const userSelect = document.getElementById('user-select');
const messageDiv = document.getElementById('message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userDataStr = userSelect.value;
    if (!userDataStr) {
        showMessage('Please select yourself from the list', 'error');
        return;
    }

    const userData = JSON.parse(userDataStr);
    const zoom_email = document.getElementById('zoom-email').value;
    const zoom_email_confirm = document.getElementById('zoom-email-confirm').value;

    if (zoom_email !== zoom_email_confirm) {
        showMessage('Email addresses do not match!', 'error');
        return;
    }

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                given_name: userData.given_name,
                family_name: userData.family_name,
                email: userData.email,
                zoom_email: zoom_email,
                zoom_email_confirm: zoom_email_confirm,
            }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
            const msg = result.isUpdate
                ? 'Registration updated successfully!'
                : 'Registration successful!';
            showMessage(msg, 'success');

            // Clear zoom email fields
            document.getElementById('zoom-email').value = '';
            document.getElementById('zoom-email-confirm').value = '';
        } else {
            showMessage(result.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage('An error occurred. Please try again.', 'error');
        console.error('Registration error:', error);
    }
});

function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.style.display = 'block';

    if (type === 'success') {
        messageDiv.style.background = '#d4edda';
        messageDiv.style.color = '#155724';
        messageDiv.style.border = '1px solid #c3e6cb';
    } else {
        messageDiv.style.background = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.style.border = '1px solid #f5c6cb';
    }

    // Hide message after 5 seconds for success
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}
