const BackgroundPage = {
  _port: null,

  init: function() {
    BackgroundPage._port = browser.runtime.connect();
  },

  send: function(action, extras = {}) {
    return new Promise((resolve) => {
      const listener = (response) => {
        if (response.response === action) {
          BackgroundPage._port.onMessage.removeListener(listener);
          resolve(response);
        }
      };

      BackgroundPage._port.onMessage.addListener(listener);
      BackgroundPage._port.postMessage({action: action, ...JSON.parse(JSON.stringify(extras))});
    });
  },

  Opts: {
    get: async function() {
      return (await BackgroundPage.send('opts--get')).result;
    },

    set: async function(opts, extras = {}) {
      await BackgroundPage.send('opts--set', {opts, extras});
    },

    saveUsingBookmark: async function() {
      return (await BackgroundPage.send('opts--save-using-bookmark')).result;
    },
  },
};

async function load() {
  const opts = await BackgroundPage.Opts.get();

  document.getElementById('save-using-bookmark').checked = await BackgroundPage.Opts.saveUsingBookmark();
  document.getElementById('save-using-bookmark').addEventListener('change', save);

  document.getElementById('active').checked = opts.active;
  document.getElementById('active').addEventListener('change', save);

  document.getElementById('max-age--amount').value = opts.maxAge.amount;
  document.getElementById('max-age--amount').addEventListener('change', save);
  document.getElementById('max-age--type').value = opts.maxAge.type;
  document.getElementById('max-age--type').addEventListener('change', save);

  document.getElementById('idle-interval').value = opts.idleInterval;
  document.getElementById('idle-interval').addEventListener('change', save);

  document.getElementById('remove-cookies-if-no-history-left').checked = opts.removeCookiesIfNoHistoryLeft;
  document.getElementById('remove-cookies-if-no-history-left').addEventListener('change', save);

  document.getElementById('max-history-elements-at-a-time').value = opts.maxHistoryElementsAtATime;
  document.getElementById('max-history-elements-at-a-time').addEventListener('change', save);

  for (const exception of opts.exceptions) {
    addException(exception);
  }
}

async function save() {
  const opts = await BackgroundPage.Opts.get();
  const extras = {
    saveUsingBookmarkOverride: document.getElementById('save-using-bookmark').checked,
  };

  opts.active = document.getElementById('active').checked;

  opts.maxAge.amount = parseFloat(document.getElementById('max-age--amount').value);
  opts.maxAge.type = document.getElementById('max-age--type').value;

  opts.idleInterval = parseFloat(document.getElementById('idle-interval').value);

  opts.removeCookiesIfNoHistoryLeft = document.getElementById('remove-cookies-if-no-history-left').checked;

  opts.maxHistoryElementsAtATime = parseFloat(document.getElementById('max-history-elements-at-a-time').value);

  opts.exceptions = [];
  for (const exception of document.getElementsByClassName('exception')) {
    const value = exception.getElementsByClassName('exception-value')[0].value;
    if (value !== '') {
      opts.exceptions.push({
        type: exception.getElementsByClassName('exception-type')[0].value,
        value: value,
      });
    }
  }

  await BackgroundPage.Opts.set(opts, extras);
}

const exceptionTypes = [
  {value: 'host', display: 'Host', valueElement: {placeholder: 'RegExp', type: 'string'}},
  {value: 'full', display: 'Full', valueElement: {placeholder: 'RegExp', type: 'string'}},
  {value: 'cookie', display: 'Cookie domain', valueElement: {placeholder: 'RegExp', type: 'string'}},
  {value: 'visits', display: 'Page has been visited more than X times', valueElement: {placeholder: 'X', type: 'number'}},
];

async function addException(data = null) {
  const container = document.createElement('div');
  container.classList.add('exception');

  const deleteBtn = document.createElement('button');
  deleteBtn.innerText = '🗑';
  deleteBtn.addEventListener('click', () => {
    container.remove();
    save();
  });
  container.appendChild(deleteBtn);

  const type = document.createElement('select');
  type.classList.add('exception-type');
  for (const o of exceptionTypes) {
    const option = document.createElement('option');
    option.value = o.value;
    option.innerText = o.display;
    type.appendChild(option);
  }
  type.addEventListener('change', () => {
    // Fix entry specifics
    const entry = exceptionTypes.find(x => x.value === type.value);
    value.placeholder = entry.valueElement.placeholder;
    value.type = entry.valueElement.type;

    // Set width - https://stackoverflow.com/a/49693251
    const select = document.createElement('select');
    select.classList.add('width-finder');
    const option = document.createElement('option');
    option.innerText = entry.display;
    select.appendChild(option);
    document.body.appendChild(select);
    type.style.width = window.getComputedStyle(select).width;
    select.remove();

    // Save
    save();
  });
  container.appendChild(type);

  const value = document.createElement('better-input');
  value.classList.add('exception-value');
  value.placeholder = 'RegExp';
  value.addEventListener('change', save);
  container.appendChild(value);

  if (data != null) {
    type.value = data.type;
    value.value = data.value;
  } else {
    type.dispatchEvent(new Event('change'));
  }

  document.getElementById('exceptions-container').appendChild(container);
}

window.addEventListener('DOMContentLoaded', async () => {
  BackgroundPage.init();

  await load();
  document.getElementById('add-exception-btn').addEventListener('click', () => addException());
});