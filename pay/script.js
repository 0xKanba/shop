/* ============================================
   MigPayments — Full Logic
   ============================================ */

// ============================================
// CONFIG
// ============================================
const CONFIG = {
    walletAddress: '0x121B845Cb550dD5B01B9eAc5BD65f79d84c6Ee99',
    network: 'Arbitrum One',
    feePercent: 0.01,
    expiryMinutes: 360,
    defaultCurrency: 'USDC',
    priceRefreshMs: 45000,
    hyperliquidEndpoint: 'https://api.hyperliquid.xyz/info',
};

// ============================================
// STATE
// ============================================
const state = {
    ethPrice: null,
    selectedCurrency: CONFIG.defaultCurrency,
    userAmount: null,     // USD amount entered by user
    userEmail: null,
    expiryTime: null,
    countdownInterval: null,
    priceInterval: null,
    isPriceLoading: false,
    priceError: null,
    currentStep: 'input', // input | payment | success
};

// ============================================
// HELPERS
// ============================================
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function formatAddress(addr) {
    const c = addr.replace('0x', '');
    const g = c.match(/.{1,4}/g) || [];
    return '0x ' + g.join(' ');
}

function formatUSD(v) { return '$' + v.toFixed(2); }

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================
// THEME — Auto-detect
// ============================================
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

// ============================================
// FETCH ETH PRICE — Hyperliquid
// ============================================
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
        // Fallback: CoinGecko
        try {
            const fb = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            if (fb.ok) {
                const d = await fb.json();
                if (d.ethereum?.usd) {
                    state.ethPrice = d.ethereum.usd;
                    state.priceError = null;
                }
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
    const parent = el.parentElement;
    if (state.isPriceLoading) {
        el.textContent = 'Loading';
        parent.style.background = 'var(--bg-input)';
        parent.style.border = '1px solid var(--bg-input-border)';
        el.style.color = 'var(--text-tertiary)';
    } else if (state.priceError) {
        el.textContent = 'Error';
        parent.style.background = 'var(--danger-subtle)';
        parent.style.border = '1px solid var(--danger-border)';
        el.style.color = 'var(--danger)';
    } else {
        el.textContent = 'Live';
        parent.style.background = 'var(--success-subtle)';
        parent.style.border = '1px solid var(--success-border)';
        el.style.color = 'var(--success)';
    }
}

function startPriceRefresh() {
    if (state.priceInterval) clearInterval(state.priceInterval);
    state.priceInterval = setInterval(fetchEthPrice, CONFIG.priceRefreshMs);
}

// ============================================
// CALCULATIONS
// ============================================
function calcSendAmount() {
    if (!state.userAmount || state.userAmount <= 0) return { amount: null, currency: state.selectedCurrency };
    const net = state.userAmount * (1 - CONFIG.feePercent / 100);
    if (state.selectedCurrency === 'USDC') return { amount: net, currency: 'USDC', decimals: 8 };
    if (state.ethPrice && state.ethPrice > 0) return { amount: net / state.ethPrice, currency: 'ETH', decimals: 8 };
    return { amount: null, currency: 'ETH' };
}

// ============================================
// STEP MANAGEMENT
// ============================================
function showStep(step) {
    state.currentStep = step;
    $('#stepInputs').style.display = step === 'input' ? 'block' : 'none';
    $('#stepPayment').style.display = step === 'payment' ? 'block' : 'none';
    $('#stepSuccess').style.display = step === 'success' ? 'block' : 'none';
    $('#cardFooter').style.display = step === 'success' ? 'none' : 'flex';
}

// ============================================
// INPUT VALIDATION
// ============================================
function validateInputs() {
    const amountEl = $('#amountInput');
    const emailEl = $('#emailInput');
    const hintAmount = $('#amountHint');
    const hintEmail = null; // We'll use a dynamic approach
    const btn = $('#generateBtn');

    const amount = parseFloat(amountEl.value);
    const email = emailEl.value.trim();

    // Reset
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

    // Email
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

function handleGenerate() {
    if (!validateInputs()) return;

    state.userAmount = parseFloat($('#amountInput').value);
    state.userEmail = $('#emailInput').value.trim();
    state.selectedCurrency = CONFIG.defaultCurrency;

    // Reset currency buttons
    $$('.currency-btn').forEach(b => b.classList.toggle('active', b.dataset.currency === 'USDC'));

    // Populate recap
    $('#recapAmount').textContent = formatUSD(state.userAmount);
    $('#recapEmail').textContent = state.userEmail;

    // Update payment display
    updatePaymentDisplay();

    // Start countdown
    initCountdown();

    // Switch step
    showStep('payment');

    // Fetch price if not yet
    if (!state.ethPrice) fetchEthPrice();
    startPriceRefresh();
}

// ============================================
// PAYMENT DISPLAY UPDATE
// ============================================
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

    // USD equiv
    const equivEl = $('#usdEquiv');
    if (state.selectedCurrency === 'ETH' && amount !== null && state.ethPrice) {
        equivEl.textContent = '≈ ' + formatUSD(amount * state.ethPrice) + ' USD';
        equivEl.style.display = 'block';
    } else {
        equivEl.style.display = 'none';
    }

    $('#warningCurrency').textContent = currency;

    // Error banner
    const slot = $('#errorBannerSlot');
    slot.innerHTML = '';
    if (state.priceError && state.selectedCurrency === 'ETH') {
        slot.innerHTML = `<div class="error-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span>Price fetch failed (${state.priceError}). Retrying automatically...</span>
        </div>`;
    }
}

// ============================================
// CURRENCY SWITCH
// ============================================
function switchCurrency(cur) {
    if (cur === state.selectedCurrency) return;
    state.selectedCurrency = cur;
    $$('.currency-btn').forEach(b => b.classList.toggle('active', b.dataset.currency === cur));
    if (cur === 'ETH' && !state.ethPrice) fetchEthPrice();
    else updatePaymentDisplay();
}

// ============================================
// COUNTDOWN
// ============================================
function initCountdown() {
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    state.expiryTime = Date.now() + CONFIG.expiryMinutes * 60 * 1000;
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
    }
}

// ============================================
// COPY
// ============================================
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

// ============================================
// "I'VE SENT" → SUCCESS
// ============================================
function handleSentPayment() {
    const { amount, currency } = calcSendAmount();

    // Stop timers
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    if (state.priceInterval) clearInterval(state.priceInterval);

    // Populate success
    $('#successEmail').textContent = state.userEmail;
    $('#successAmount').textContent = formatUSD(state.userAmount);
    $('#successCurrency').textContent = currency + (amount !== null ? ' (' + amount.toFixed(6) + ')' : '');

    showStep('success');
}

// ============================================
// BACK → INPUTS
// ============================================
function handleBack() {
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    if (state.priceInterval) clearInterval(state.priceInterval);
    showStep('input');
    validateInputs();
}

// ============================================
// CANCEL
// ============================================
function showCancel() { $('#cancelOverlay').classList.add('active'); document.body.style.overflow = 'hidden'; }
function hideCancel() { $('#cancelOverlay').classList.remove('active'); document.body.style.overflow = ''; }

function confirmCancel() {
    hideCancel();
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    if (state.priceInterval) clearInterval(state.priceInterval);

    $('#paymentCard').innerHTML = `
        <div style="padding:56px 28px;text-align:center">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5" width="44" height="44" style="margin:0 auto 14px;display:block">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <h3 style="font-size:18px;font-weight:800;margin-bottom:6px">Payment Cancelled</h3>
            <p style="font-size:12px;color:var(--text-secondary);line-height:1.6">This payment request is no longer valid.<br>Contact the merchant if this was an error.</p>
        </div>`;
}

// ============================================
// EVENT BINDINGS
// ============================================
function bindEvents() {
    // Input validation on type
    $('#amountInput').addEventListener('input', validateInputs);
    $('#emailInput').addEventListener('input', validateInputs);

    // Generate
    $('#generateBtn').addEventListener('click', handleGenerate);

    // Enter key on inputs
    $('#amountInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#emailInput').focus(); });
    $('#emailInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleGenerate(); });

    // Currency
    $('#btnUSDC').addEventListener('click', () => switchCurrency('USDC'));
    $('#btnETH').addEventListener('click', () => switchCurrency('ETH'));

    // Sent payment
    $('#sentBtn').addEventListener('click', handleSentPayment);

    // Back
    $('#backBtn').addEventListener('click', handleBack);

    // Cancel
    $('#cancelBtn').addEventListener('click', showCancel);
    $('#cancelBackBtn').addEventListener('click', hideCancel);
    $('#cancelConfirmBtn').addEventListener('click', confirmCancel);
    $('#cancelOverlay').addEventListener('click', e => { if (e.target === $('#cancelOverlay')) hideCancel(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hideCancel(); });
}

// ============================================
// INIT
// ============================================
function init() {
    initTheme();
    bindEvents();
    showStep('input');

    // Pre-fetch ETH price
    fetchEthPrice().then(() => startPriceRefresh());
}

document.addEventListener('DOMContentLoaded', init);
