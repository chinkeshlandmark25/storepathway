// Authentication logic for login and register
export let token = null;

export async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/api/login', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({username, password})
    });
    const data = await res.json();
    if (data.token) {
        token = data.token;
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('session-container').style.display = 'flex';
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
