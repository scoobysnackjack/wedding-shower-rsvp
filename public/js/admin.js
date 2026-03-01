(function () {
  const params = new URLSearchParams(window.location.search);
  const keyFromUrl = params.get('admin_key');

  function getAdminKey() {
    if (keyFromUrl) return keyFromUrl;
    return sessionStorage.getItem('admin_key');
  }

  function setAdminKey(key) {
    sessionStorage.setItem('admin_key', key);
  }

  function askAdminKey() {
    var key = prompt('Enter admin key:');
    if (key) {
      setAdminKey(key);
      return key;
    }
    return null;
  }

  function authHeaders() {
    var key = getAdminKey();
    if (!key) key = askAdminKey();
    return key ? { 'x-admin-key': key } : {};
  }

  function apiUrl(path) {
    var key = getAdminKey();
    if (!key) key = askAdminKey();
    var url = '/api/admin' + path;
    if (key) url += (path.indexOf('?') >= 0 ? '&' : '?') + 'admin_key=' + encodeURIComponent(key);
    return url;
  }

  function fetchAdmin(path) {
    return fetch(apiUrl(path), { headers: authHeaders() });
  }

  var guestsTbody = document.getElementById('guests-tbody');
  var statTotal = document.getElementById('stat-total');
  var statYes = document.getElementById('stat-yes');
  var statNo = document.getElementById('stat-no');
  var statPending = document.getElementById('stat-pending');
  var btnExport = document.getElementById('btn-export');
  var csvFile = document.getElementById('csv-file');
  var btnUpload = document.getElementById('btn-upload');
  var uploadResult = document.getElementById('upload-result');
  var eventTitle = document.getElementById('event-title');
  var btnSendInvites = document.getElementById('btn-send-invites');
  var smsLog = document.getElementById('sms-log');

  function loadStats() {
    fetchAdmin('/stats')
      .then(function (r) {
        if (r.status === 401) {
          sessionStorage.removeItem('admin_key');
          askAdminKey();
          return loadStats();
        }
        return r.json();
      })
      .then(function (data) {
        if (!data) return;
        statTotal.textContent = data.total;
        statYes.textContent = data.yes;
        statNo.textContent = data.no;
        statPending.textContent = data.not_responded;
      });
  }

  function loadGuests() {
    fetchAdmin('/guests')
      .then(function (r) {
        if (r.status === 401) {
          sessionStorage.removeItem('admin_key');
          askAdminKey();
          return loadGuests();
        }
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.guests) return;
        guestsTbody.innerHTML = '';
        data.guests.forEach(function (g) {
          var tr = document.createElement('tr');
          var status = g.response === 'yes' ? 'status-yes' : (g.response === 'no' ? 'status-no' : 'status-pending');
          var statusText = g.response === 'yes' ? 'Yes' : (g.response === 'no' ? 'No' : 'Pending');
          tr.innerHTML =
            '<td>' + escapeHtml(g.name) + '</td>' +
            '<td>' + escapeHtml(g.phone) + '</td>' +
            '<td>' + escapeHtml(String(g.total_invited || 1)) + '</td>' +
            '<td>' + escapeHtml(String(g.attending_count || 0)) + '</td>' +
            '<td><span class="status-badge ' + status + '">' + statusText + '</span></td>';
          guestsTbody.appendChild(tr);
        });
      });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  btnExport.addEventListener('click', function (e) {
    e.preventDefault();
    var key = getAdminKey();
    if (!key) key = askAdminKey();
    if (key) window.location.href = apiUrl('/export');
  });

  btnUpload.addEventListener('click', function () {
    var file = csvFile.files[0];
    if (!file) {
      uploadResult.textContent = 'Please select a CSV file.';
      return;
    }
    var form = new FormData();
    form.append('file', file);
    var key = getAdminKey();
    if (!key) key = askAdminKey();
    uploadResult.textContent = 'Uploading...';
    fetch('/api/guests/upload?admin_key=' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'x-admin-key': key },
      body: form,
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) {
          uploadResult.textContent = 'Error: ' + data.error;
          return;
        }
        uploadResult.textContent = 'Created ' + data.created + ' guest(s).' +
          (data.errors && data.errors.length ? ' Errors: ' + data.errors.length : '');
        loadGuests();
        loadStats();
        csvFile.value = '';
      })
      .catch(function () {
        uploadResult.textContent = 'Upload failed.';
      });
  });

  btnSendInvites.addEventListener('click', function () {
    var key = getAdminKey();
    if (!key) key = askAdminKey();
    if (!key) return;
    smsLog.textContent = 'Sending... (1 per second)';
    btnSendInvites.disabled = true;
    fetch('/api/guests/send-invites?admin_key=' + encodeURIComponent(key), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
      body: JSON.stringify({ event_title: eventTitle.value || "Jesston & Kerston's Couple's Shower" }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        btnSendInvites.disabled = false;
        if (data.error) {
          smsLog.textContent = 'Error: ' + data.error;
          return;
        }
        var lines = ['Sent: ' + data.sent + ', Failed: ' + data.failed];
        (data.log || []).forEach(function (entry) {
          lines.push((entry.status === 'success' ? '[OK] ' : '[FAIL] ') + entry.phone + ' ' + (entry.name || '') + (entry.error ? ' - ' + entry.error : ''));
        });
        smsLog.innerHTML = lines.join('\n').replace(/\n/g, '<br>');
      })
      .catch(function () {
        btnSendInvites.disabled = false;
        smsLog.textContent = 'Request failed.';
      });
  });

  loadStats();
  loadGuests();
})();
