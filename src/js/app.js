import {populations} from './populations.js';

class Graph {
  constructor() {
    this.section = document.querySelector('section');
    this.files = {
      online: {
        confirmed: `https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv`,
        deaths: `https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv`,
      },
      offline: {
        confirmed: 'confirmed.csv',
        deaths: 'deaths.csv',
      },
      data: {
        confirmed: [],
        deaths: [],
      },
    };

    this.newTime = localStorage.getItem('newTime');
    this.currentTime = new Date();
    this.allCountries = [];
    this.currentCountry = {};

    for (let x in this.files.data) {
      this.files.data[x] = (localStorage.getItem(x)) ?
          JSON.parse(localStorage.getItem(x)) :
          [];

    }

    this.lastTime = (this.newTime) ? this.newTime : new Date();
    this.populations = populations;
    this.cTotal = document.getElementById('countryConfirmed');
    this.dTotal = document.getElementById('countryDeaths');
    this.rTotal = document.getElementById('countryRatio');
    this.pTotal = document.getElementById('countryTotal');
    this.cinput = document.querySelector('#country');
    this.sinput = document.querySelector('#scale');
    this.tinput = document.querySelector('#totals');
    this.tlinput = document.querySelector('#totalLog');
    this.chinput = document.querySelector('#change');
    this.ginput = document.querySelector('#growth');
    this.viewOptions = document.getElementById('showOptions');
    this.viewDetails = document.getElementById('showDetails');
    this.resetButton = document.getElementById('resetButton');
    this.dates = [];

    this.viewOptions.addEventListener('click', ev => {
      document.getElementById('options').classList.toggle('hide');

    });
    this.viewDetails.addEventListener('click', ev => {
      document.getElementById('details').classList.toggle('hide');

    });

    const inputs = ['s', 'c', 't', 'ch', 'g', 'tl'].forEach(val =>
        this[`${val}input`].addEventListener('change', () => this.buildDivs()));

    this.init().then();
  }

  async init() {
    this.resetData();
    await this.buildDivs();
  }

  async getValues(data) {
    if (data.length) {
      return this.syncData(data.pop()).
          then(async () => await this.getValues(data));
    }
  }

  async buildDivs() {
    this.section.innerHTML = '';
    const status = `${(location.host.split(':')[0] === 'localhost') ?
        'off' :
        'on'}line`;
    const that = this;
    if (this.ginput.checked) {
      this.sinput.max = 20;
      this.sinput.min = 1;
    } else {
      this.sinput.max = 3;
      this.sinput.min = 0.01;
    }

    await this.getValues(Object.entries(this.files[status])).then(() => {
      Object.entries(this.files.data).map(([key, val], i) => {
        this.currentCountry[key] = {};
        this.currentCountry[key].data = that.formatData(val);

        if (!this.cinput.options.length) this.buildSelectOptions();
        let total = 0;
        Object.values(this.currentCountry[key].data).
            forEach((num, ind, all) => {
              if (!i && !ind) this.currentCountry.country = num.country;
              total += num.total;
            });
        this.currentCountry[key].total = total;
      });

      let co = this.currentCountry.confirmed;
      let de = this.currentCountry.deaths;

      const populationName = this.populations[this.currentCountry.country];
      const population = parseInt(populationName.replace(/,/gi, ''));

      this.countryPopulation = population;

      this.cTotal.innerText = `${co.total} | %${(co.total / population).toFixed(
          4)}`;
      this.dTotal.innerText = `${de.total} | %${(de.total / population).toFixed(
          4)}`;
      this.rTotal.innerText = `${(de.total / co.total).toFixed(2)}%`;
      this.pTotal.innerText = `${populationName}`;


      this.currentCountry.confirmed.data.forEach((a, b, c) => {

        let div = document.createElement('div');
        let span = document.createElement('span');
        let provinceConfirmedPercentage = co.data[b].total ? co.data[b].total/co.total : co.data[b].total;
        let provinceDeathsPercentage = de.data[b].total ? de.data[b].total/de.total : de.data[b].total;
        span.innerHTML = `<p>${a.province} <br> Confirmed:<strong>${co.data[b].total}</strong> | Deaths:<strong>${de.data[b].total}</strong> <br> <em>Percentage of Country</em><br>Confirmed:<strong>${provinceConfirmedPercentage.toFixed(4)}</strong> | Deaths:<strong>${provinceDeathsPercentage.toFixed(4)}</strong></p>`;
        span.classList.add('label');
        div.appendChild(span);

        this.section.appendChild(div);
        const sc = (this.chinput.checked) ?
            co.data[b].changes :
            (this.ginput.checked) ?
                co.data[b].growth :
                (this.tlinput.checked) ? co.data[b].log : co.data[b].data;
        const sd = (this.chinput.checked) ?
            de.data[b].changes :
            (this.ginput.checked) ?
                de.data[b].growth :
                (this.tlinput.checked) ? de.data[b].log : de.data[b].data;
        // console.log(sc, sd)
        this.calculateValues(sc.reverse(), sd.reverse(), div);

      });



    });

    const readableDate = new Date(parseInt(localStorage.getItem('newTime')));
    document.getElementById(
        'dataLastFetched').innerText = readableDate.toUTCString();
  }

  async calculateValues(c, d, div, next) {
    next = next || 0;

    const confirm = c.pop();
    const death = d.pop();

    if (c.length && d.length) {

      let cSpan = document.createElement('span');
      cSpan.style.height = '0';

      let dSpan = cSpan.cloneNode();
      dSpan.classList.add('deaths');

      div.appendChild(dSpan);
      div.appendChild(cSpan);

      setTimeout(() => {
        cSpan.style.height = parseFloat(confirm) *
            parseFloat(this.sinput.value) + 'px';
        dSpan.style.height = parseFloat(death) * parseFloat(this.sinput.value) +
            'px';
      }, 1000);
      next += 1;
      return this.calculateValues(c, d, div, next);

    }

  }

  async syncData(file) {

    const name = file[0];

    if (!this.files.data[name] || !this.files.data[name].length) {
      // console.log('fetch')
      try {
        return await fetch(file[1].toString(), {mode: 'cors'}).
            then(async da => {
              const data = await da.text();

              if (data) {
                localStorage.setItem('newTime',
                    this.currentTime.getTime().toString());
                localStorage.setItem(name,
                    JSON.stringify(this.splitData(data.slice(1))));
                this.files.data[name] = this.splitData(data).
                    filter(a => a.length);

              }
              return this.files.data[name];
            });

      } catch (err) {
        console.log(`Error: ${err}`);
        localStorage.clear();
      }

    } else {
      // console.log('retrieve')
      return this.files.data[name];
    }
  }

  splitData(data) {
    return data.split(/[\n\r|\r|\n\r|\n]/gi);
  }

  formatData(data) {
    if (data && data.length) {

      this.date = data[0].split(',').slice(4);
      return data.slice(1).map((line, ind) => {
        if (line) {
          let dt;
          line = line.replace(`, `, ` `).replace(/"/gi, ``).split(`,`);
          if (ind &&
              !this.allCountries.includes(line[1])) this.allCountries.push(
              line[1]);
          this.country = (this.cinput.selectedIndex === -1) ?
              'Canada' :
              this.cinput.value;

          if (line[1] === this.country) {
            dt = {};
            dt.country = line[1];
            dt.province = line[0];

            dt.data = line.slice(4).map(a => parseInt(a));
            dt.total = line.slice(4).reduce((a, b, c, d) => {
              let e = parseInt(d[c + 1]) - parseInt(b);
              e = isNaN(e) ? 0 : e;
              return parseInt(e + a);
            });

            dt.changes = dt.data.map(
                (a, b, c) => c[b - 1] ? Math.abs(a - c[b - 1]) : 0);
            dt.growth = dt.changes.map((a, b, c) => {
              let calc = (c[b - 1] && c[b + 1])
                  ? Math.abs(c[b + 1] - a) / Math.abs(a - c[b - 1])
                  : 0;
              return (!isNaN(calc) && isFinite(calc)) ? parseFloat(calc) : 0;
            });
            dt.log = dt.data.map((a, b, c) => {
              let calc = Math.log(parseFloat(a));
              return (!isNaN(calc) && isFinite(calc)) ? calc : 0;
            });

          }

          return dt;
        } else {
          return false;
        }
      }).filter(a => a);
    }
  }

  buildSelectOptions() {
    this.allCountries.sort().forEach(a => {
      const opt = document.createElement('option');
      if (a === this.country) {
        opt.selected = true;
      }
      opt.innerText = a.toString();
      this.cinput.append(opt);
    });
  }

  resetData() {
    this.resetButton.addEventListener('click', () => {
      localStorage.clear();
      window.location.reload();
    });

  }
}

const graph = new Graph();