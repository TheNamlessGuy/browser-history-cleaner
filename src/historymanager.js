const HistoryManager = {
  init: async function() {
    const opts = await Opts.get();
    if (!opts.active) { return; }

    if (!browser.idle.onStateChanged.hasListener(HistoryManager._onStateChanged)) {
      browser.idle.onStateChanged.addListener(HistoryManager._onStateChanged);
    }

    browser.idle.setDetectionInterval(opts.idleInterval);
  },

  _onStateChanged: async function(state) {
    if (state === 'idle') {
      await HistoryManager._delete();
    }
  },

  _delete: async function() {
    const opts = await Opts.get();

    const end = new Date();
    if (opts.maxAge.type === 'year') {
      end.setFullYear(end.getFullYear() - opts.maxAge.amount);
    } else if (opts.maxAge.type === 'month') {
      end.setMonth(end.getMonth() - opts.maxAge.amount);
    } else if (opts.maxAge.type === 'day') {
      end.setDate(end.getDate() - opts.maxAge.amount);
    } else if (opts.maxAge.type === 'hour') {
      end.setHours(end.getHours() - opts.maxAge.amount);
    } else if (opts.maxAge.type === 'minute') {
      end.setMinutes(end.getMinutes() - opts.maxAge.amount);
    } else if (opts.maxAge.type === 'second') {
      end.setSeconds(end.getSeconds() - opts.maxAge.amount);
    }

    const exceptions = opts.exceptions.map((x) => {
      return {
        type: x.type,
        value: new RegExp(x.value),
      };
    });

    while (true) {
      const results = await browser.history.search({text: '', startTime: 0, maxResults: opts.maxHistoryElementsAtATime});
      const filtered = results.filter((x) => {
        if (x.lastVisitTime > end.getTime()) {
          return false;
        }

        const url = new URL(x.url);
        return !exceptions.some((exception) => {
          if (exception.type === 'host') {
            return url.host.match(exception.value);
          } else { // exception.type === 'full'
            return x.url.match(exception.value);
          }
        });
      });

      if (filtered.length === 0) {
        break;
      }

      for (const entry of filtered) {
        const url = new URL(entry.url);
        await browser.history.deleteUrl({url: entry.url});

        const data = await browser.history.search({text: url.host, startTime: 0, maxResults: 1});
        if (data.length === 0) {
          const urlStr = `${url.protocol}//${url.host}`;
          const cookies = await browser.cookies.getAll({firstPartyDomain: null, url: urlStr});
          for (const cookie of cookies) {
            await browser.cookies.remove({name: cookie.name, url: urlStr});
          }
        }
      }
    }
  },
};