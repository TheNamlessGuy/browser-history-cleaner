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
    }

    const exceptions = opts.exceptions.map((x) => {
      return {
        type: x.type,
        value: new RegExp(x.value),
      };
    }).reduce((data, exception) => {
      if (exception.type === 'cookie') {
        data.cookie.push(exception);
      } else {
        data.url.push(exception);
      }
      return data;
    }, {url: [], cookie: []});

    while (true) {
      const results = await browser.history.search({text: '', startTime: 0, maxResults: opts.maxHistoryElementsAtATime});
      const filtered = results.filter((x) => {
        if (x.lastVisitTime > end.getTime()) {
          return false;
        }

        const url = new URL(x.url);
        return !exceptions.url.some((exception) => {
          if (exception.type === 'host') {
            return url.host.match(exception.value);
          } else if (exception.type === 'full') {
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

        if (!opts.removeCookiesIfNoHistoryLeft) { continue; }

        const cookies = await browser.cookies.getAll({firstPartyDomain: null, url: `${url.protocol}//${url.host}`});
        for (const cookie of cookies) {
          const excepted = exceptions.cookie.some((exception) => cookie.domain.match(exception.value));
          if (excepted) { continue; }

          const data = await browser.history.search({text: cookie.domain, startTime: 0, maxResults: 1});
          if (data.length === 0) {
            await browser.cookies.remove({firstPartyDomain: null, name: cookie.name, url: cookie.domain});
          }
        }
      }
    }
  },
};