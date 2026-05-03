/* ============================================
   MigPayments — Full Logic + localStorage
   ============================================ */

const CONFIG = {
    walletAddress: '0x121B845Cb550dD5B01B9eAc5BD65f79d84c6Ee99',
    network: 'Arbitrum One',
    feePercent: 0.01,
    expiryMinutes: 360,
    defaultCurrency: 'USDC',
    priceRefreshMs: 45000,
    hyperliquidEndpoint: 'https://api.hyperliquid.xyz/info',
    storageKey: 'migpay_state',
};

const state = {
    ethPrice: null,
    selectedCurrency: CONFIG.defaultCurrency,
    userAmount: null,
    userEmail: null,
    expiryTime: null,
    countdownInterval: null,
    priceInterval: null,
    isPriceLoading: false,
    priceError: null,
    currentStep: 'input',
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function formatAddress(addr) {
    const c = addr.replace('0x', '');
    return '0x ' + (c.match(/.{1,4}/g) || []).join(' ');
}
function formatUSD(v) { return '$' + v.toFixed(2); }
function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

/* ============================================
   localStorage — SAVE / LOAD / CLEAR
   ============================================ */
function saveState() {
    const data = {
        step: 'payment',
        amount: state.userAmount,
        email: state.userEmail,
        currency: state.selectedCurrency,
        expiryTime: state.expiryTime,
        savedAt: Date.now(),
    };
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(data)); } catch (_) {}
}

function loadState() {
    try {
        const raw = localStorage.getItem(CONFIG.storageKey);
        if (!raw) return null;
        const data = JSON.parse(raw);

        // Make sure we have valid data
        if (!data.amount || !data.email || !data.expiryTime) {
            clearState();
            return null;
        }

        // Check if expired
        if (Date.now() >= data.expiryTime) {
            clearState();
            return null;
        }

        return data;
    } catch (_) {
        clearState();
        return null;
    }
}

function clearState() {
    try { localStorage.removeItem(CONFIG.storageKey); } catch (_) {}
}

/* ============================================
   THEME
   ============================================ */
function initTheme() {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = dark => {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        $('#themeLabel').textContent = dark ? 'Dark' : 'Light';
        $('#themeIconSvg').innerHTML = dark
            ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
            : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    };
    apply(mq.matches);
    mq.addEventListener('change', e => apply(e.matches));
}

/* ============================================
   ETH PRICE — Hyperliquid + CoinGecko fallback
   ============================================ */
async function fetchEthPrice() {
    state.isPriceLoading = true;
    state.priceError = null;
    updateLiveIndicator();

    try {
        const res = await fetch(CONFIG.hyperliquidEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'allMids' }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data.ETH || isNaN(parseFloat(data.ETH))) throw new Error('Bad data');
        state.ethPrice = parseFloat(data.ETH);
        state.priceError = null;
    } catch (err) {
        console.error('Hyperliquid error:', err);
        state.priceError = err.message;
        try {
            const fb = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            if (fb.ok) {
                const d = await fb.json();
                if (d.ethereum?.usd) { state.ethPrice = d.ethereum.usd; state.priceError = null; }
            }
        } catch (_) {}
    } finally {
        state.isPriceLoading = false;
        updateLiveIndicator();
        updatePaymentDisplay();
    }
}

function updateLiveIndicator() {
    const el = $('#liveText');
    const p = el.parentElement;
    if (state.isPriceLoading) {
        el.textContent = 'Loading'; p.style.background = 'var(--bg-input)';
        p.style.border = '1px solid var(--bg-input-border)'; el.style.color = 'var(--text-tertiary)';
    } else if (state.priceError) {
        el.textContent = 'Error'; p.style.background = 'var(--danger-subtle)';
        p.style.border = '1px solid var(--danger-border)'; el.style.color = 'var(--danger)';
    } else {
        el.textContent = 'Live'; p.style.background = 'var(--success-subtle)';
        p.style.border = '1px solid var(--success-border)'; el.style.color = 'var(--success)';
    }
}

function startPriceRefresh() {
    if (state.priceInterval) clearInterval(state.priceInterval);
    state.priceInterval = setInterval(fetchEthPrice, CONFIG.priceRefreshMs);
}

/* ============================================
   CALCULATIONS
   ============================================ */
function calcSendAmount() {
    if (!state.userAmount || state.userAmount <= 0) return { amount: null, currency: state.selectedCurrency };
    const net = state.userAmount * (1 - CONFIG.feePercent / 100);
    if (state.selectedCurrency === 'USDC') return { amount: net, currency: 'USDC', decimals: 8 };
    if (state.ethPrice && state.ethPrice > 0) return { amount: net / state.ethPrice, currency: 'ETH', decimals: 8 };
    return { amount: null, currency: 'ETH' };
}

/* ============================================
   STEP MANAGEMENT
   ============================================ */
function showStep(step) {
    state.currentStep = step;
    $('#stepInputs').style.display = step === 'input' ? 'block' : 'none';
    $('#stepPayment').style.display = step === 'payment' ? 'block' : 'none';
    $('#stepSuccess').style.display = step === 'success' ? 'block' : 'none';
    $('#cardFooter').style.display = step === 'success' ? 'none' : 'flex';
}

/* ============================================
   INPUT VALIDATION
   ============================================ */
function validateInputs() {
    const amountEl = $('#amountInput');
    const emailEl = $('#emailInput');
    const hintAmount = $('#amountHint');
    const btn = $('#generateBtn');

    const amount = parseFloat(amountEl.value);
    const email = emailEl.value.trim();

    hintAmount.className = 'input-hint';
    hintAmount.textContent = 'Enter the amount you wish to pay';
    let valid = true;

    if (!amountEl.value || isNaN(amount) || amount <= 0) {
        hintAmount.className = 'input-hint error';
        hintAmount.textContent = 'Please enter a valid amount';
        valid = false;
    } else if (amount < 1) {
        hintAmount.className = 'input-hint error';
        hintAmount.textContent = 'Minimum amount is $1.00';
        valid = false;
    } else if (amount > 100000) {
        hintAmount.className = 'input-hint error';
        hintAmount.textContent = 'Maximum amount is $100,000.00';
        valid = false;
    } else {
        hintAmount.className = 'input-hint success';
        hintAmount.textContent = '✓ Valid amount';
    }

    const emailHint = emailEl.parentElement.nextElementSibling;
    if (!email) {
        emailHint.className = 'input-hint error';
        emailHint.textContent = 'Email is required to receive the project file';
        valid = false;
    } else if (!validateEmail(email)) {
        emailHint.className = 'input-hint error';
        emailHint.textContent = 'Please enter a valid email address';
        valid = false;
    } else {
        emailHint.className = 'input-hint success';
        emailHint.textContent = '✓ Project .zip will be sent here';
    }

    btn.disabled = !valid;
    return valid;
}

/* ============================================
   GENERATE PAYMENT
   ============================================ */
function handleGenerate() {
    if (!validateInputs()) return;

    state.userAmount = parseFloat($('#amountInput').value);
    state.userEmail = $('#emailInput').value.trim();
    state.selectedCurrency = CONFIG.defaultCurrency;

    $$('.currency-btn').forEach(b => b.classList.toggle('active', b.dataset.currency === 'USDC'));

    $('#recapAmount').textContent = formatUSD(state.userAmount);
    $('#recapEmail').textContent = state.userEmail;

    updatePaymentDisplay();
    initCountdown();
    showStep('payment');

    // ← حفظ في localStorage
    saveState();

    if (!state.ethPrice) fetchEthPrice();
    startPriceRefresh();
}

/* ============================================
   RESTORE FROM localStorage (after reload)
   ============================================ */
function restoreFromStorage() {
    const saved = loadState();
    if (!saved) return false;

    // Restore state
    state.userAmount = saved.amount;
    state.userEmail = saved.email;
    state.selectedCurrency = saved.currency || CONFIG.defaultCurrency;
    state.expiryTime = saved.expiryTime;

    // Fill inputs (in case user goes back)
    $('#amountInput').value = saved.amount;
    $('#emailInput').value = saved.email;

    // Set currency buttons
    $$('.currency-btn').forEach(b => b.classList.toggle('active', b.dataset.currency === state.selectedCurrency));

    // Fill recap
    $('#recapAmount').textContent = formatUSD(saved.amount);
    $('#recapEmail').textContent = saved.email;

    // Show payment step
    showStep('payment');

    // Start countdown from remaining time
    initCountdown();

    // Update display
    updatePaymentDisplay();

    // Fetch fresh price
    fetchEthPrice().then(() => startPriceRefresh());

    return true;
}

/* ============================================
   PAYMENT DISPLAY
   ============================================ */
function updatePaymentDisplay() {
    $('#displayAddress').textContent = formatAddress(CONFIG.walletAddress);

    const { amount, currency, decimals } = calcSendAmount();

    if (amount !== null) {
        $('#displayAmount').textContent = amount.toFixed(decimals) + ' ' + currency;
        $('#displayAmount').style.color = '';
    } else if (state.selectedCurrency === 'ETH' && state.priceError) {
        $('#displayAmount').textContent = 'Price unavailable';
        $('#displayAmount').style.color = 'var(--danger)';
    } else if (state.selectedCurrency === 'ETH') {
        $('#displayAmount').textContent = 'Loading price...';
        $('#displayAmount').style.color = '';
    }

    const equivEl = $('#usdEquiv');
    if (state.selectedCurrency === 'ETH' && amount !== null && state.ethPrice) {
        equivEl.textContent = '≈ ' + formatUSD(amount * state.ethPrice) + ' USD';
        equivEl.style.display = 'block';
    } else {
        equivEl.style.display = 'none';
    }

    $('#warningCurrency').textContent = currency;

    const slot = $('#errorBannerSlot');
    slot.innerHTML = '';
    if (state.priceError && state.selectedCurrency === 'ETH') {
        slot.innerHTML = `<div class="error-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span>Price fetch failed (${state.priceError}). Retrying...</span>
        </div>`;
    }
}

/* ============================================
   CURRENCY SWITCH
   ============================================ */
function switchCurrency(cur) {
    if (cur === state.selectedCurrency) return;
    state.selectedCurrency = cur;
    $$('.currency-btn').forEach(b => b.classList.toggle('active', b.dataset.currency === cur));

    // Update saved state currency
    try {
        const raw = localStorage.getItem(CONFIG.storageKey);
        if (raw) {
            const d = JSON.parse(raw);
            d.currency = cur;
            localStorage.setItem(CONFIG.storageKey, JSON.stringify(d));
        }
    } catch (_) {}

    if (cur === 'ETH' && !state.ethPrice) fetchEthPrice();
    else updatePaymentDisplay();
}

/* ============================================
   COUNTDOWN
   ============================================ */
function initCountdown() {
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    state.expiryTime = state.expiryTime || (Date.now() + CONFIG.expiryMinutes * 60 * 1000);
    updateCountdown();
    state.countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const remaining = Math.max(0, state.expiryTime - Date.now());
    const ts = Math.floor(remaining / 1000);
    const h = Math.floor(ts / 3600);
    const m = Math.floor((ts % 3600) / 60);
    const s = ts % 60;

    $('#cdHours').textContent = String(h).padStart(2, '0');
    $('#cdMinutes').textContent = String(m).padStart(2, '0');
    $('#cdSeconds').textContent = String(s).padStart(2, '0');

    const progress = (remaining / (CONFIG.expiryMinutes * 60 * 1000)) * 100;
    $('#countdownBar').style.width = progress + '%';

    const block = $('#countdownBlock');
    block.classList.remove('warning', 'danger');
    if (remaining <= 5 * 60 * 1000) block.classList.add('danger');
    else if (remaining <= 30 * 60 * 1000) block.classList.add('warning');

    if (remaining <= 0) {
        clearInterval(state.countdownInterval);
        $('#countdownBar').style.width = '0%';
        // انتهى الوقت — نظف localStorage
        clearState();
    }
}

/* ============================================
   COPY
   ============================================ */
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (_) {}
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch (_) { return false; }
}

function handleCopy(type) {
    let text, btnEl;
    if (type === 'address') {
        text = CONFIG.walletAddress;
        btnEl = $('#copyAddressBtn');
    } else {
        const { amount } = calcSendAmount();
        if (amount === null) return;
        text = amount.toFixed(8);
        btnEl = $('#copyAmountBtn');
    }
    if (!text || !btnEl) return;
    copyToClipboard(text).then(ok => {
        if (ok) {
            btnEl.classList.add('copied');
            setTimeout(() => btnEl.classList.remove('copied'), 2000);
        }
    });
}

/* ============================================
   SENT PAYMENT → SUCCESS
   ============================================ */
function handleSentPayment() {
    const { amount, currency } = calcSendAmount();
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    if (state.priceInterval) clearInterval(state.priceInterval);

    $('#successEmail').textContent = state.userEmail;
    $('#successAmount').textContent = formatUSD(state.userAmount);
    $('#successCurrency').textContent = currency + (amount !== null ? ' (' + amount.toFixed(6) + ')' : '');

    // ← مسح localStorage بعد النجاح
    clearState();
    showStep('success');
}

/* ============================================
   BACK → INPUTS
   ============================================ */
function handleBack() {
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    if (state.priceInterval) clearInterval(state.priceInterval);

    // ← مسح localStorage عند الرجوع
    clearState();

    showStep('input');
    validateInputs();
}

/* ============================================
   CANCEL
   ============================================ */
function showCancel() { $('#cancelOverlay').classList.add('active'); document.body.style.overflow = 'hidden'; }
function hideCancel() { $('#cancelOverlay').classList.remove('active'); document.body.style.overflow = ''; }

function confirmCancel() {
    hideCancel();
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    if (state.priceInterval) clearInterval(state.priceInterval);

    // ← مسح localStorage
    clearState();

    // Reset state
    state.userAmount = null;
    state.userEmail = null;
    state.selectedCurrency = CONFIG.defaultCurrency;
    state.expiryTime = null;

    $('#amountInput').value = '';
    $('#emailInput').value = '';
    $('#amountHint').className = 'input-hint';
    $('#amountHint').textContent = 'Enter the amount you wish to pay';
    const emailHint = $('#emailInput').parentElement.nextElementSibling;
    emailHint.className = 'input-hint';
    emailHint.textContent = 'Project .zip file will be sent to this email after payment';
    $('#generateBtn').disabled = true;
    $$('.currency-btn').forEach(b => b.classList.toggle('active', b.dataset.currency === 'USDC'));
    $('#cdHours').textContent = '--';
    $('#cdMinutes').textContent = '--';
    $('#cdSeconds').textContent = '--';
    $('#countdownBar').style.width = '100%';
    $('#countdownBlock').classList.remove('warning', 'danger');
    $('#copyAddressBtn').classList.remove('copied');
    $('#copyAmountBtn').classList.remove('copied');

    showStep('input');
}

/* ============================================
   EVENTS
   ============================================ */
function bindEvents() {
    $('#amountInput').addEventListener('input', validateInputs);
    $('#emailInput').addEventListener('input', validateInputs);
    $('#generateBtn').addEventListener('click', handleGenerate);
    $('#amountInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#emailInput').focus(); });
    $('#emailInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleGenerate(); });
    $('#btnUSDC').addEventListener('click', () => switchCurrency('USDC'));
    $('#btnETH').addEventListener('click', () => switchCurrency('ETH'));
    $('#sentBtn').addEventListener('click', handleSentPayment);
    $('#backBtn').addEventListener('click', handleBack);
    $('#cancelBtn').addEventListener('click', showCancel);
    $('#cancelBackBtn').addEventListener('click', hideCancel);
    $('#cancelConfirmBtn').addEventListener('click', confirmCancel);
    $('#cancelOverlay').addEventListener('click', e => { if (e.target === $('#cancelOverlay')) hideCancel(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hideCancel(); });
}

/* ============================================
   INIT — يحاول استعادة الحالة أولاً
   ============================================ */
function init() {
    initTheme();
    bindEvents();

    // ← محاولة استعادة الحالة المحفوظة
    if (restoreFromStorage()) {
        // تم استعادة شاشة الدفع — لا شيء آخر
        return;
    }

    // لا يوجد حالة محفوظة — ابدأ من الخطوة 1
    showStep('input');
    fetchEthPrice().then(() => startPriceRefresh());
}

document.addEventListener('DOMContentLoaded', init);
