document.querySelectorAll('[data-phone-input]').forEach((input) => {
    input.addEventListener('input', () => {
        input.value = input.value.replace(/[^0-9]/g, '').slice(0, 11);
    });
});
