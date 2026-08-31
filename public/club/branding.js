(() => {
  const input = document.getElementById('brand-logo-input');
  const preview = document.getElementById('brand-preview');
  const status = document.getElementById('branding-status');
  const removeBtn = document.getElementById('brand-logo-remove');

  if (!input || !preview) return;

  const setStatus = (message, isError = false) => {
    if (!status) return;
    status.textContent = message || '';
    status.className = 'small mt-2 ' + (isError ? 'text-danger' : 'text-success');
  };

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    preview.innerHTML = `<img src="${localUrl}" alt="Podgląd logo">`;
    setStatus('Przesyłanie logo…');

    const form = new FormData();
    form.append('logo', file);

    try {
      const response = await fetch('/admin/branding/logo', {
        method: 'POST',
        body: form
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Nie udało się zapisać logo.');

      preview.innerHTML = `<img src="${data.logoUrl}?v=${Date.now()}" alt="Logo klubu" style="max-width:100%;max-height:100%;object-fit:contain">`;
      setStatus('Logo zapisane. Odświeżam branding…');
      setTimeout(() => window.location.reload(), 650);
    } catch (error) {
      setStatus(error.message || 'Błąd podczas wysyłania logo.', true);
    } finally {
      input.value = '';
    }
  });

  removeBtn?.addEventListener('click', async () => {
    if (!confirm('Usunąć aktualne logo z aplikacji?')) return;
    setStatus('Usuwanie logo…');

    try {
      const response = await fetch('/admin/branding/logo', { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Nie udało się usunąć logo.');

      preview.innerHTML = '<span class="text-secondary small">Brak logo</span>';
      setStatus('Logo usunięte.');
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      setStatus(error.message || 'Błąd podczas usuwania logo.', true);
    }
  });
})();
