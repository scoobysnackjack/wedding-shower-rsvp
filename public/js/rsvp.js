(function () {
  const params = new URLSearchParams(window.location.search);
  const guestId = params.get('guest_id');

  const card = document.getElementById('rsvp-card');
  const buttons = document.getElementById('buttons');
  const btnYes = document.getElementById('btn-yes');
  const btnNo = document.getElementById('btn-no');
  const attendanceControls = document.getElementById('attendance-controls');
  const attendanceHint = document.getElementById('attendance-hint');
  const countMinus = document.getElementById('count-minus');
  const countPlus = document.getElementById('count-plus');
  const countValue = document.getElementById('count-value');
  const confirmWrap = document.getElementById('confirm-wrap');
  const btnConfirm = document.getElementById('btn-confirm');
  const confirmation = document.getElementById('confirmation');
  const errorEl = document.getElementById('error-message');

  let selectedResponse = null;
  let maxInvites = 1;
  let attendingCount = 1;
  let guestLoaded = false;

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('show');
    confirmation.classList.remove('show');
  }

  function hideError() {
    errorEl.classList.remove('show');
  }

  function showConfirmation(msg) {
    confirmation.textContent = msg;
    confirmation.classList.add('show');
    hideError();
  }

  function setLoading(loading) {
    card.classList.toggle('loading', loading);
    btnYes.disabled = loading;
    btnNo.disabled = loading;
    btnConfirm.disabled = loading;
    countMinus.disabled = loading || attendingCount <= 1;
    countPlus.disabled = loading || attendingCount >= maxInvites;
  }

  function setAlreadyResponded(response, savedAttendingCount) {
    buttons.style.display = 'none';
    attendanceControls.style.display = 'none';
    confirmWrap.style.display = 'none';
    const text = response === 'yes'
      ? "You're attending (" + (savedAttendingCount || 1) + ") — we can't wait to see you!"
      : "You've declined. We'll miss you!";
    showConfirmation(text);
  }

  function renderCounter() {
    countValue.textContent = String(attendingCount);
    countMinus.disabled = attendingCount <= 1;
    countPlus.disabled = attendingCount >= maxInvites;
  }

  function renderSelection() {
    btnYes.classList.toggle('is-selected', selectedResponse === 'yes');
    btnNo.classList.toggle('is-selected', selectedResponse === 'no');
    confirmWrap.style.display = 'block';
    btnConfirm.disabled = false;
    attendanceControls.style.display = selectedResponse === 'yes' ? 'block' : 'none';
  }

  function setInviteHint() {
    const extraGuests = Math.max(0, maxInvites - 1);
    attendanceHint.textContent = '(You + ' + extraGuests + ' guest' + (extraGuests === 1 ? '' : 's') + ' max)';
  }

  function submitResponse(response, countToSave) {
    hideError();
    setLoading(true);
    fetch('/api/rsvp/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_id: guestId,
        response: response,
        attending_count: countToSave,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            if (res.status === 409) {
              setAlreadyResponded(data.response, data.attending_count);
              return;
            }
            showError(data.error || 'Could not save response.');
            setLoading(false);
            return;
          }
          buttons.style.display = 'none';
          attendanceControls.style.display = 'none';
          confirmWrap.style.display = 'none';
          const msg = response === 'yes'
            ? "You're attending (" + countToSave + ") — we can't wait to see you!"
            : "You've declined. We'll miss you!";
          showConfirmation(msg);
          setLoading(false);
        });
      })
      .catch(function () {
        showError('Could not save response. Please try again.');
        setLoading(false);
      });
  }

  btnYes.addEventListener('click', function () {
    selectedResponse = 'yes';
    renderSelection();
  });

  btnNo.addEventListener('click', function () {
    selectedResponse = 'no';
    renderSelection();
  });

  countMinus.addEventListener('click', function () {
    if (attendingCount > 1) {
      attendingCount -= 1;
      renderCounter();
    }
  });

  countPlus.addEventListener('click', function () {
    if (attendingCount < maxInvites) {
      attendingCount += 1;
      renderCounter();
    }
  });

  btnConfirm.addEventListener('click', function () {
    if (!guestLoaded || !guestId) {
      showError('Preview mode: open a unique guest link to submit RSVP.');
      return;
    }
    if (!selectedResponse) {
      showError('Please choose Will Attend or Will Not Attend.');
      return;
    }
    const countToSave = selectedResponse === 'yes' ? attendingCount : 0;
    submitResponse(selectedResponse, countToSave);
  });

  setInviteHint();
  renderCounter();
  attendanceControls.style.display = 'none';
  confirmWrap.style.display = 'none';

  if (!guestId) {
    guestLoaded = false;
  } else {
    fetch('/api/rsvp/guest?guest_id=' + encodeURIComponent(guestId))
      .then(function (res) {
        if (!res.ok) {
          if (res.status === 404) {
            showError('Invalid invitation link.');
            buttons.style.display = 'none';
            attendanceControls.style.display = 'none';
            confirmWrap.style.display = 'none';
            return null;
          }
          return res.json().then(function (data) {
            showError(data.error || 'Something went wrong.');
            buttons.style.display = 'none';
            attendanceControls.style.display = 'none';
            confirmWrap.style.display = 'none';
            return null;
          });
        }
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        if (data.already_responded) {
          setAlreadyResponded(data.response, data.attending_count);
          return;
        }
        maxInvites = Math.max(1, Number.parseInt(String(data.total_invited || 1), 10));
        attendingCount = Math.min(attendingCount, maxInvites);
        setInviteHint();
        renderCounter();
        guestLoaded = true;
      })
      .catch(function () {
        showError('Could not load invitation. Please try again.');
        buttons.style.display = 'none';
        attendanceControls.style.display = 'none';
        confirmWrap.style.display = 'none';
      });
  }
})();
