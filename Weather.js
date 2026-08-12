(function(){
  const searchInput = document.getElementById('searchInput');
  const suggestionsEl = document.getElementById('suggestions');
  const statusLine = document.getElementById('statusLine');
  const locBtn = document.getElementById('locBtn');
  const unitBtn = document.getElementById('unitBtn');
  const hero = document.getElementById('hero');
  const emptyState = document.getElementById('emptyState');

  let unit = 'C'; // C or F
  let lastData = null;
  let debounceTimer = null;

  const WMO = {
    0:  ['Clear sky','sun'],
    1:  ['Mainly clear','sun-cloud'],
    2:  ['Partly cloudy','sun-cloud'],
    3:  ['Overcast','cloud'],
    45: ['Fog','fog'],
    48: ['Depositing rime fog','fog'],
    51: ['Light drizzle','rain'],
    53: ['Moderate drizzle','rain'],
    55: ['Dense drizzle','rain'],
    56: ['Light freezing drizzle','rain'],
    57: ['Dense freezing drizzle','rain'],
    61: ['Slight rain','rain'],
    63: ['Moderate rain','rain'],
    65: ['Heavy rain','rain'],
    66: ['Light freezing rain','rain'],
    67: ['Heavy freezing rain','rain'],
    71: ['Slight snow','snow'],
    73: ['Moderate snow','snow'],
    75: ['Heavy snow','snow'],
    77: ['Snow grains','snow'],
    80: ['Slight rain showers','rain'],
    81: ['Moderate rain showers','rain'],
    82: ['Violent rain showers','rain'],
    85: ['Slight snow showers','snow'],
    86: ['Heavy snow showers','snow'],
    95: ['Thunderstorm','storm'],
    96: ['Thunderstorm, slight hail','storm'],
    99: ['Thunderstorm, heavy hail','storm'],
  };

  function iconSvg(kind){
    switch(kind){
      case 'sun':
        return `<circle cx="32" cy="32" r="12" fill="var(--amber)"/>
          <g stroke="var(--amber)" stroke-width="3" stroke-linecap="round">
          <line x1="32" y1="6" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="58"/>
          <line x1="6" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/>
          <line x1="13" y1="13" x2="19" y2="19"/><line x1="45" y1="45" x2="51" y2="51"/>
          <line x1="51" y1="13" x2="45" y2="19"/><line x1="19" y1="45" x2="13" y2="51"/>
          </g>`;
      case 'sun-cloud':
        return `<circle cx="24" cy="26" r="9" fill="var(--amber)"/>
          <path d="M14 46a10 10 0 0 1 2-19.8A13 13 0 0 1 41 30a9 9 0 0 1-1 16H14z" fill="var(--text-mid)" opacity="0.85"/>`;
      case 'cloud':
        return `<path d="M12 46a10 10 0 0 1 2-19.8A13 13 0 0 1 45 30a9 9 0 0 1-1 16H12z" fill="var(--text-mid)"/>`;
      case 'fog':
        return `<g stroke="var(--text-mid)" stroke-width="3" stroke-linecap="round">
          <line x1="10" y1="24" x2="54" y2="24"/><line x1="10" y1="32" x2="54" y2="32"/>
          <line x1="10" y1="40" x2="54" y2="40"/></g>`;
      case 'rain':
        return `<path d="M12 34a10 10 0 0 1 2-19.8A13 13 0 0 1 45 18a9 9 0 0 1-1 16H12z" fill="var(--text-mid)"/>
          <g stroke="var(--sky)" stroke-width="3" stroke-linecap="round">
          <line x1="22" y1="46" x2="19" y2="56"/><line x1="34" y1="46" x2="31" y2="56"/><line x1="46" y1="46" x2="43" y2="56"/>
          </g>`;
      case 'snow':
        return `<path d="M12 32a10 10 0 0 1 2-19.8A13 13 0 0 1 45 16a9 9 0 0 1-1 16H12z" fill="var(--text-mid)"/>
          <g stroke="var(--text-hi)" stroke-width="2.5" stroke-linecap="round">
          <line x1="22" y1="44" x2="22" y2="56"/><line x1="16" y1="50" x2="28" y2="50"/>
          <line x1="42" y1="44" x2="42" y2="56"/><line x1="36" y1="50" x2="48" y2="50"/>
          </g>`;
      case 'storm':
        return `<path d="M12 30a10 10 0 0 1 2-19.8A13 13 0 0 1 45 14a9 9 0 0 1-1 16H12z" fill="var(--text-mid)"/>
          <polygon points="30,40 22,54 30,54 26,62 40,46 32,46 36,40" fill="var(--amber)"/>`;
      default:
        return `<circle cx="32" cy="32" r="12" fill="var(--sky)"/>`;
    }
  }

  function aqiInfo(aqi){
    if(aqi==null) return ['—','var(--text-lo)','No data'];
    if(aqi<=50) return ['Good','var(--mint)','Air quality is satisfactory'];
    if(aqi<=100) return ['Moderate','#c9e05f','Acceptable for most people'];
    if(aqi<=150) return ['Sensitive','var(--amber)','Sensitive groups take care'];
    if(aqi<=200) return ['Unhealthy','#ff9a52','Everyone may feel effects'];
    if(aqi<=300) return ['Very Unhealthy','var(--coral)','Health warning'];
    return ['Hazardous','#c94b6b','Emergency conditions'];
  }

  searchInput.addEventListener('input', ()=>{
    clearTimeout(debounceTimer);
    const q = searchInput.value.trim();
    if(q.length<2){ suggestionsEl.classList.remove('show'); return; }
    debounceTimer = setTimeout(()=> fetchSuggestions(q), 300);
  });

  document.addEventListener('click', (e)=>{
    if(!e.target.closest('.search-box')) suggestionsEl.classList.remove('show');
  });

  async function fetchSuggestions(q){
    try{
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
      const data = await res.json();
      if(!data.results || data.results.length===0){
        suggestionsEl.classList.remove('show');
        return;
      }
      suggestionsEl.innerHTML = data.results.map(r=>{
        const parts = [r.admin1, r.country].filter(Boolean).join(', ');
        return `<div class="suggestion-item" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${r.name}" data-region="${parts}">
          <span>${r.name}</span><span class="sub">${parts}</span>
        </div>`;
      }).join('');
      suggestionsEl.classList.add('show');
      suggestionsEl.querySelectorAll('.suggestion-item').forEach(item=>{
        item.addEventListener('click', ()=>{
          const {lat, lon, name, region} = item.dataset;
          searchInput.value = name;
          suggestionsEl.classList.remove('show');
          loadWeather(parseFloat(lat), parseFloat(lon), name, region);
        });
      });
    }catch(err){
      suggestionsEl.classList.remove('show');
    }
  }

  searchInput.addEventListener('keydown', async (e)=>{
    if(e.key==='Enter'){
      e.preventDefault();
      clearTimeout(debounceTimer);
      let first = suggestionsEl.querySelector('.suggestion-item');
      if(!first){
        const q = searchInput.value.trim();
        if(q.length<2) return;
        setStatus('Searching…');
        await fetchSuggestions(q);
        first = suggestionsEl.querySelector('.suggestion-item');
      }
      if(first){ first.click(); }
      else{ setStatus(`No matches found for "${searchInput.value.trim()}".`, true); }
    }
  });

  locBtn.addEventListener('click', ()=>{
    setStatus('Locating…');

    if(!navigator.geolocation){
      locateByIP();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos=>{
        loadWeather(pos.coords.latitude, pos.coords.longitude, 'Current location', '');
      },
      err=>{
        locateByIP();
      },
      {timeout:6000}
    );
  });

  async function locateByIP(){
    const providers = [
      {
        url: 'https://ipwho.is/',
        parse: d => d.success===false ? null : {lat:d.latitude, lon:d.longitude, city:d.city, region:[d.region, d.country].filter(Boolean).join(', ')}
      },
      {
        url: 'https://get.geojs.io/v1/ip/geo.json',
        parse: d => (d.latitude && d.longitude) ? {lat:parseFloat(d.latitude), lon:parseFloat(d.longitude), city:d.city, region:[d.region, d.country].filter(Boolean).join(', ')} : null
      },
      {
        url: 'https://ipapi.co/json/',
        parse: d => (d.latitude && d.longitude) ? {lat:d.latitude, lon:d.longitude, city:d.city, region:[d.region, d.country_name].filter(Boolean).join(', ')} : null
      }
    ];

    for(const p of providers){
      try{
        const res = await fetch(p.url);
        if(!res.ok) continue;
        const d = await res.json();
        const loc = p.parse(d);
        if(loc && loc.lat && loc.lon){
          loadWeather(loc.lat, loc.lon, loc.city || 'Your area', loc.region);
          setStatus(`Located approximately via IP — showing ${loc.city || 'your area'}.`);
          return;
        }
      }catch(err){
        // try next provider
      }
    }
    setStatus('Could not detect your location automatically — please search for a place instead.', true);
  }

  unitBtn.addEventListener('click', ()=>{
    unit = unit==='C' ? 'F' : 'C';
    unitBtn.textContent = unit==='C' ? '°C' : '°F';
    if(lastData) render(lastData);
  });

  function setStatus(msg, isErr){
    statusLine.textContent = msg;
    statusLine.classList.toggle('err', !!isErr);
  }

  function cToF(c){ return c*9/5+32; }

  async function loadWeather(lat, lon, name, region){
    setStatus('Fetching live readout…');
    try{
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`;

      const [wRes, aRes] = await Promise.all([fetch(weatherUrl), fetch(aqiUrl)]);
      const wData = await wRes.json();
      let aData = {};
      try{ aData = await aRes.json(); }catch(e){}

      if(!wData.current){ throw new Error('No data returned'); }

      lastData = {
        name, region,
        lat, lon,
        current: wData.current,
        daily: wData.daily,
        aqi: aData.current ? aData.current.us_aqi : null,
        tz: wData.timezone
      };
      render(lastData);
      setStatus(`Showing readings for ${name}${region? ', '+region:''}.`);
    }catch(err){
      setStatus('Could not fetch weather data — try another search.', true);
    }
  }

  function render(d){
    emptyState.style.display = 'none';
    hero.classList.add('show');

    document.getElementById('placeName').textContent = d.name;
    document.getElementById('placeMeta').textContent = d.region ? d.region : `${d.lat.toFixed(2)}, ${d.lon.toFixed(2)}`;

    const now = new Date();
    document.getElementById('updatedTag').textContent = 'UPDATED ' + now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

    const c = d.current;
    let temp = c.temperature_2m;
    let feels = c.apparent_temperature;
    if(unit==='F'){ temp = cToF(temp); feels = cToF(feels); }
    document.getElementById('tempVal').textContent = Math.round(temp);
    document.getElementById('tempUnit').textContent = unit==='C' ? '°C' : '°F';

    const wmo = WMO[c.weather_code] || ['Unknown', 'sun'];
    document.getElementById('condText').textContent = wmo[0];
    document.getElementById('condSub').textContent = `Feels like ${Math.round(feels)}°${unit}`;
    document.getElementById('weatherIcon').innerHTML = iconSvg(wmo[1]);

    const windSpeed = c.wind_speed_10m;
    const windDir = c.wind_direction_10m;
    const windGust = c.wind_gusts_10m;
    document.getElementById('windVal').innerHTML = `${Math.round(windSpeed)} <span class="unit">km/h</span>`;
    document.getElementById('windGust').textContent = `gusts ${Math.round(windGust)} km/h`;
    document.getElementById('windDirLabel').textContent = degToCompass(windDir);
    document.getElementById('compassSvg').innerHTML = compassSvgMarkup(windDir);

    const hum = c.relative_humidity_2m;
    document.getElementById('humidityVal').innerHTML = `${hum} <span class="unit">%</span>`;
    document.getElementById('humiditySvg').innerHTML = humiditySvgMarkup(hum);

    const aqi = d.aqi;
    const [aqiLabel, aqiColor, aqiDesc] = aqiInfo(aqi);
    document.getElementById('aqiVal').innerHTML = `${aqi!=null?Math.round(aqi):'--'} <span class="unit">US AQI</span>`;
    const pill = document.getElementById('aqiPill');
    pill.textContent = aqiLabel;
    pill.style.background = aqiColor+'22';
    pill.style.color = aqiColor;
    document.getElementById('aqiSub').textContent = aqiDesc;
    document.getElementById('aqiSvg').innerHTML = aqiSvgMarkup(aqi, aqiColor);

    const rainProb = (d.daily && d.daily.precipitation_probability_max) ? d.daily.precipitation_probability_max[0] : (c.precipitation>0?100:0);
    document.getElementById('rainVal').innerHTML = `${rainProb} <span class="unit">%</span>`;
    document.getElementById('rainSub').textContent = c.precipitation>0 ? `${c.precipitation} mm falling now` : 'no rain right now';
    document.getElementById('rainSvg').innerHTML = rainSvgMarkup(rainProb);
  }

  function degToCompass(deg){
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg/22.5) % 16];
  }

  function compassSvgMarkup(deg){
    return `
      <circle cx="38" cy="38" r="34" fill="none" stroke="var(--line)" stroke-width="2"/>
      <text x="38" y="12" text-anchor="middle" font-size="8" fill="var(--text-lo)" font-family="JetBrains Mono">N</text>
      <text x="38" y="70" text-anchor="middle" font-size="8" fill="var(--text-lo)" font-family="JetBrains Mono">S</text>
      <text x="8" y="41" text-anchor="middle" font-size="8" fill="var(--text-lo)" font-family="JetBrains Mono">W</text>
      <text x="68" y="41" text-anchor="middle" font-size="8" fill="var(--text-lo)" font-family="JetBrains Mono">E</text>
      <g transform="rotate(${deg} 38 38)">
        <polygon points="38,14 33,40 38,34 43,40" fill="var(--sky)"/>
        <line x1="38" y1="38" x2="38" y2="58" stroke="var(--text-lo)" stroke-width="2"/>
      </g>
      <circle cx="38" cy="38" r="3" fill="var(--text-hi)"/>
    `;
  }

  function humiditySvgMarkup(pct){
    const fillHeight = 60 * (pct/100);
    const y = 65 - fillHeight;
    return `
      <defs><clipPath id="humClip"><rect x="5" y="${y}" width="60" height="${fillHeight}"/></clipPath></defs>
      <path d="M35 5 C35 5 12 34 12 48 A23 23 0 0 0 58 48 C58 34 35 5 35 5Z" fill="none" stroke="var(--line)" stroke-width="2"/>
      <path d="M35 5 C35 5 12 34 12 48 A23 23 0 0 0 58 48 C58 34 35 5 35 5Z" fill="var(--sky)" opacity="0.75" clip-path="url(#humClip)"/>
    `;
  }

  function aqiSvgMarkup(aqi, color){
    const pct = aqi==null ? 0 : Math.min(aqi/300, 1);
    const w = 110 * pct;
    return `
      <rect x="5" y="24" width="110" height="10" rx="5" fill="var(--line)"/>
      <rect x="5" y="24" width="${w}" height="10" rx="5" fill="${color}"/>
      <circle cx="${5+w}" cy="29" r="7" fill="${color}" stroke="var(--bg-0)" stroke-width="2"/>
    `;
  }

  function rainSvgMarkup(pct){
    const drops = Math.round(pct/20);
    let out = '';
    for(let i=0;i<5;i++){
      const active = i < drops;
      out += `<path transform="translate(${5+i*13},${active?4:10})" d="M6 0 C6 0 0 9 0 13 A6 6 0 0 0 12 13 C12 9 6 0 6 0Z" fill="${active?'var(--sky)':'var(--line)'}"/>`;
    }
    return out;
  }
})();