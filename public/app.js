const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const charCount = document.getElementById('charCount');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toastText');
const toastIcon = document.getElementById('toastIcon');
const textareaWrap = document.getElementById('textareaWrap');

let isSending = false;

// Char count
messageInput.addEventListener('input', () => {
  const len = messageInput.value.length;
  charCount.textContent = `${len} / 2000`;
  charCount.className = 'char-count';
  if (len > 1800 && len <= 1950) charCount.classList.add('warn');
  if (len > 1950) charCount.classList.add('danger');

  // auto expand
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 300) + 'px';
});

// Focus effect accessibility
messageInput.addEventListener('focus', () => {
  textareaWrap.style.borderColor = 'var(--accent)';
});

function showToast(message, isError = false) {
  toastText.textContent = message;
  toast.classList.toggle('error', isError);
  toastIcon.textContent = isError ? '✕' : '✓';
  toastIcon.style.background = isError ? 'var(--danger)' : '#10b981';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

async function sendMessage() {
  if (isSending) return;
  const message = messageInput.value.trim();
  if (!message) {
    showToast('Tulis pesanmu dulu ya!', true);
    messageInput.focus();
    textareaWrap.style.borderColor = '#ef4444';
    setTimeout(() => textareaWrap.style.borderColor = '', 1500);
    return;
  }

  isSending = true;
  sendBtn.disabled = true;
  btnText.textContent = 'Mengirim...';
  btnSpinner.style.display = 'inline-block';

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Gagal mengirim pesan');
    }

    // Success
    showToast(data.message || 'Pesan berhasil dikirim! Terima kasih atas masukannya.');
    messageInput.value = '';
    charCount.textContent = '0 / 2000';
    charCount.className = 'char-count';
    messageInput.style.height = 'auto';

    // Celebration micro-animation
    sendBtn.style.transform = 'scale(0.98)';
    setTimeout(() => sendBtn.style.transform = '', 150);
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan, coba lagi', true);
  } finally {
    isSending = false;
    sendBtn.disabled = false;
    btnText.textContent = 'Kirim Pesan →';
    btnSpinner.style.display = 'none';
  }
}

sendBtn.addEventListener('click', sendMessage);

// Ctrl/Cmd + Enter to send
messageInput.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});

// Prevent empty spaces submit on Enter alone (keep newline)
