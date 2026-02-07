document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    // Common UI initializations can go here
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('.theme-toggle i');
    if (icon) {
        icon.className = theme === 'light' ? 'ri-moon-line' : 'ri-sun-line';
    }
}

// LocalStorage Poll Helpers
const STORAGE_KEYS = {
    POLLS: 'ops_polls',
    VOTES: 'ops_user_votes' // Stores poll IDs user has voted on
};

function getPolls() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.POLLS) || '[]');
}

function savePolls(polls) {
    localStorage.setItem(STORAGE_KEYS.POLLS, JSON.stringify(polls));
}

function createPoll(question, options, expiryDays) {
    const polls = getPolls();
    const pollId = 'poll_' + Date.now();

    const newPoll = {
        id: pollId,
        question: question,
        options: options, // Array of strings
        createdAt: new Date().toISOString(),
        expiresAt: expiryDays ? new Date(Date.now() + expiryDays * 86400000).toISOString() : null,
        votes: options.reduce((acc, opt) => ({ ...acc, [opt]: 0 }), {})
    };

    polls.unshift(newPoll);
    savePolls(polls);
    return pollId;
}

function deletePoll(pollId) {
    let polls = getPolls();
    polls = polls.filter(p => p.id !== pollId);
    savePolls(polls);

    // Also clean up user's vote record if any
    let userVotes = getUserVotes();
    userVotes = userVotes.filter(id => id !== pollId);
    localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(userVotes));
}

function getUserVotes() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.VOTES) || '[]');
}

function hasVoted(pollId) {
    return getUserVotes().includes(pollId);
}

function submitVote(pollId, option) {
    if (hasVoted(pollId)) {
        showToast("You have already voted on this poll.", "error");
        return false;
    }

    const polls = getPolls();
    const pollIndex = polls.findIndex(p => p.id === pollId);

    if (pollIndex !== -1) {
        // Increment vote count
        polls[pollIndex].votes[option] = (polls[pollIndex].votes[option] || 0) + 1;
        savePolls(polls);

        // Record that user has voted
        const userVotes = getUserVotes();
        userVotes.push(pollId);
        localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(userVotes));

        return true;
    }
    return false;
}

// Chart & Results Logic
function calculateResults(poll) {
    const totalVotes = Object.values(poll.votes).reduce((a, b) => a + b, 0);
    const results = poll.options.map(option => {
        const count = poll.votes[option] || 0;
        const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
        return { option, count, percentage };
    });
    return { totalVotes, results };
}

function drawPieChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    let total = data.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) {
        // Draw empty circle
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
        return;
    }

    let startAngle = 0;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 70;

    data.forEach((item, index) => {
        const sliceAngle = (item.count / total) * (Math.PI * 2);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();

        ctx.fillStyle = colors[index % colors.length];
        ctx.fill();

        startAngle += sliceAngle;
    });

    // Draw center hole for donut effect (optional but looks modern)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 45, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim();
    ctx.fill();
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-fade-up`;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 2rem;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 1rem;
        box-shadow: var(--shadow);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    `;

    const icon = type === 'success' ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill';
    const color = type === 'success' ? 'var(--success)' : 'var(--danger)';

    toast.innerHTML = `
        <i class="${icon}" style="color: ${color}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
