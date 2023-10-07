const Opts = {
  _default: {
    active: false,
    maxAge: {
      amount: 7,
      type: 'day', // 'year'|'month'|'day'|'hour'|'minute'
    },
    idleInterval: 15, // seconds
    maxHistoryElementsAtATime: 9999,
    exceptions: [], // {type: 'host'|'full'|'cookie'|'visits', value: string}[]
    removeCookiesIfNoHistoryLeft: true,
  },

  _v: () => browser.runtime.getManifest().version,

  init: async function() {
    let {opts, changed} = await BookmarkOpts.init(Opts._default);

    const currentVersion = Opts._v();
    const optsVersion = opts._v ?? '0.0.0';

    if (currentVersion > optsVersion) {
      opts._v = currentVersion;
      changed = true;
    }

    if (changed) {
      await Opts.set(opts);
    }
  },

  get: async function() {
    const opts = await BookmarkOpts.get();
    if (opts != null && Object.keys(opts).length > 0) {
      return opts;
    }

    await Opts.init();
    return await Opts.get();
  },

  set: async function(opts, extras = {}) {
    await BookmarkOpts.set(opts, extras);
  },

  onChanged: async function() {
    await HistoryManager.init();
  },
};