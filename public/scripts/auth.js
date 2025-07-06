export async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/api/login', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({username, password})
    });
    const data = await res.json();
    if (data.token) {
        localStorage.setItem('jwt_token', data.token);
        // SPA navigation instead of direct DOM manipulation
        if (window.page) {
            window.page('/session');
        } else {
            // fallback: hide auth, show session if elements exist
            const authCont = document.getElementById('auth-container');
            if (authCont) authCont.style.display = 'none';
            const sessCont = document.getElementById('session-container');
            if (sessCont) sessCont.style.display = 'flex';
        }
    } else showMsg('auth-msg', data.error || 'Login failed');
}

export async function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/api/register', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({username, password})
    });
    const data = await res.json();
    if (data.userId) showMsg('auth-msg', 'Registered! Please login.');
    else showMsg('auth-msg', data.error || 'Registration failed');
}

export function showMsg(id, msg) {
    document.getElementById(id).innerText = msg;
}
