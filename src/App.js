import { useEffect, useState } from 'react';
import ReactTooltip from 'react-tooltip';
//import TimezonePicker from 'react-timezone';

const fractionToFlorence = (fractionOfDay, resolution = 4, trailingZeroes = true) => {
  // cut the leading zero and resolution at the end
  var hexTime = fractionOfDay.toString(16).substring(1, resolution + 2);
  if (hexTime.length < 2) {
    hexTime = '.0';
  }
  // it's possible that the number might be so round that there are missing 0s at the end, so check if it's long enough, if not add trailingZeroes
  return trailingZeroes ? hexTime.padEnd(resolution + 1, '0') : hexTime;
}

const toHHmm = (fraction) => {
  return Math.floor(24 * fraction).toString().padStart(2, '0') + ':' + (Math.round(24 * 60 * fraction) % 60).toString().padStart(2, '0');
};

// returns a 24 bit (6 hex character) representation of florence time.
// javascript bit operations are done in 32bit, so calling the returned
// value's .toString(16) will give 6 character output.
const msToFlorence = (ms, resolution, trailingZeroes) => {
  // from us to florence-centered [0,1) fraction of day
  return fractionToFlorence(
    (
      ( ms / (1e3 * 24*60*60) )
      + 11.25 / 360 // Florence
//      - date.getTimezoneOffset() / (24*60) // timezone
    ) % 1, resolution, trailingZeroes);
  // for (let i = 0; i < resolution; i++) {
  //   fractionOfDay *= 16;
  //   hexTime = (hexTime << 4) + fractionOfDay >> 0;
  //   fractionOfDay = fractionOfDay % 1;
  // }
  // no decimal point but trailing 0s
  // return hexTime.toString(16);
  // no trailing 0s but preceding "0."
//  return (hexTime / (1 << 24)).toString(16);
};

//const dateToFlorence = (date, resolution, trailingZeroes) => {
//  return msToFlorence(date.getTime() - 1e3 * 60 * date.getTimezoneOffset(), resolution, trailingZeroes);
//}

const x = new Date().toString();
const localTzOffsetPos = x.indexOf('GMT') + 3;
// sign plus non-zero-prefixed hour
const localTzHourOffset = x[localTzOffsetPos] + parseInt(x.substring(localTzOffsetPos + 1, localTzOffsetPos+3));
const localTzName = x.substring(x.indexOf('(') + 1, x.length-1);

const Clock = () => {
  const [now, setNow] = useState(Date.now());
  const [florence, setFlorence] = useState(msToFlorence(now));
  useEffect(() => {
    setTimeout(() => {
      setNow(Date.now());
      setFlorence(msToFlorence(now));
    }, 300);
  }, [now]);

  // https://www.npmjs.com/package/react-tooltip
  const explanations = ['hours, minutes and seconds are but arbitrary subdivisions of what humanity really care about: the earth day. if we take the length of a full day to be "1", then hours are really<br>just fractional subdivisions, which should therefore be marked *after* the comma point.', 'each day is broken into 16 hexadecimal hours.<br>1 hexadecimal hour is equivalent to 1.5 SI hours', 'each hexadecimal hour is broken into 16 hexadecimal maximes.<br>1 day therefore contains 256 hexadecimal maximes.<br>1 hexadecimal maxime is equivalent to ~5 1/2 minutes in SI units.', 'each hexadecimal maxime is broken into 16 hexadecimal minutes.<br>1 day therefore contains 4096 hexadecimal minutes.<br>1 hexadecimal minute is equivalent to ~21.09 SI seconds.', 'each hexadecimal minute is broken into 16 hexadecimal seconds.<br>1 day therefore contains 65536 hexadecimal seconds.<br><br>1 hexadecimal second is equivalent to ~1.318 SI seconds.'];
  const digits = explanations.map((ex, i) => <span className="time" key={i} data-tip={ex}>{florence.charAt(i)}</span>);
  return <div className="boxed" style={{ flexBasis: 'auto', width: '-webkit-fill-available', fontSize: '160%', textAlign: 'center' }}>
    <div>it is currently</div>
    <div style={{ fontSize: '400%', fontWeight: 'bold', fontFamily: 'monospace', margin: '1rem 0' }}>{digits}</div>
    <div>Universal Florence Hexadecimal Mean Time</div>
    <ReactTooltip style={{ width: "100px",
"word-break": "break-all",
"overflow-wrap": "break-word",
display: "block"}} multiline={true} />
  </div>;
};

// http://www.steffen-eitner.homepage.t-online.de/tempilo/tempkons.htm
const App = () => {
  // ground truth = FRACTION of day (according to time input)
  // hex = based on fraction + tz

  // 4 input components:
  // * hex time slider [0, 255]
  // * 5 minute time slider [0, 287]
  // * 'hh:mm' string as created by <input type="time">
  // * timezone selector

  const [fraction, setFraction] = useState(0.5);
  const [tz, setTz] = useState(0);

  const selectTz = (e) => {
    setTz(e.target.value);
  };

  const [tzOptions, setTzOptions] = useState([[ '', 'Universal Coordinated Time', '' ]]);
  // https://gist.github.com/alyssaq/f1f0ec50e79f1c089554d0de855dd09c
  useEffect(() => {
    fetch('tz.csv').then(r => r.text()).then(t => {
      const opts = t.split("\n").map(l => l.split(','));
      setTzOptions(opts);
      var idx = opts.findIndex((el) => el[1] === localTzName);
      if (idx === -1) {
        // Safari does abbreviations not full string, which can be ambiguous
        idx = opts.findIndex((el) => el[0] === localTzName && el[2].startsWith(localTzHourOffset));
      }
      setTz(idx === -1 ? 63 : idx); // UTC
    })
  }, []);

  const addTZoffset = (fraction, direction = -1, florenceOffset = 1) => {
    fraction += florenceOffset * 11.25 / 360;
    if (tzOptions[tz][2] !== '') {
      // hour offset first
      const offset = Math.sign(direction) * parseInt(tzOptions[tz][2]) / 24;
      fraction += offset;
      if (tzOptions[tz][2].includes(':')) {
        fraction += Math.sign(offset) * parseInt(tzOptions[tz][2].substring(-2)) / (24 * 60);
      }
    }
    return (fraction + 1) % 1;
  };

  const typeHex = (e) => {
    if (e.target.value.charAt(0) !== '.') {
      return;
    }
    const v = parseInt(e.target.value.substring(1), 16);
    if (isNaN(v)) {
      return;
    }
    setFraction(addTZoffset((e.target.value.length === 2 ? 16*v : v) / 256, 1, -1));
  };

  const dragHex = (e) => {
    // don't add the florence offset
    setFraction(addTZoffset(parseInt(e.target.value)/256, 1, -1));
  };

  const typeTime = (e) => {
    setFraction((parseInt(e.target.value.substring(0, 2)) * 60 + parseInt(e.target.value.substring(3))) / (24*60));
  };

  const dragTime = (e) => {
    setFraction(parseInt(e.target.value) / 288);
  }

  return (<>
    <div className="flex">
      <Clock />

      <div className="boxed">
        <div>
          <h2>why hexadecimal time?</h2>
          <p>good reasons to follow.</p>
          <h2>why universal time?</h2>
          <p>i'll tell you later.</p>
          <h2>why Florence?</h2>
          <p>arbitrary decisions need to be bold.</p>
        </div>
      </div>

      <div className="boxed flex conversion">
        <h2>convert to/from your local time</h2>
        <div style={{ width: '100%' }}>
          <input type="text" value={fractionToFlorence(addTZoffset(fraction), 2)} onChange={typeHex} max-length="3" style={{ width: '4ex', position: 'relative', left: 'calc(' + 100*addTZoffset(fraction)%100 + '% - 10px)' }}/>
        </div>

        <input type="range" min="0" max="255" value={(addTZoffset(fraction)*256)%256} onChange={dragHex} />
        <div style={{ fontSize: '150%' }}>⥮</div>
        <input type="range" min="0" max="287" value={fraction*288} onChange={dragTime} />

        <input type="time" step="60" value={toHHmm(fraction)} onChange={typeTime} style={{ width: '12ex' }} />

        <select value={tz} onChange={selectTz} style={{ maxWidth: '100%' }}>
          { tzOptions.map((x, i) => <option value={i} key={i}>UTC{x[2]}: {x[1]} ({x[0]})</option>) }
        </select>
      </div>
    </div>
    <footer>a service provided by the <a href="https://thiswasyouridea.com">Futile Software Corporation</a></footer>
  </>);
}
// French in 17xx: https://en.wikipedia.org/wiki/Decimal_time

// http://www.intuitor.com/hex/hexclock.html
          // <div>
          //   <button>&lt;&lt;</button>
          //   <button>&gt;&gt;</button>
          // </div>

          // <p>the commonly used subdivisions of the day (24 hours in a day, 60 minutes in an hour, 60 seconds in a minute) are tedious. we owe their existence to go back to the <a href="https://en.wikipedia.org/wiki/Babylonian_cuneiform_numerals">Mesopotamian</a> science from 4000 years ago introduced the use of a base 60 number system.</p>
          // <img style={{ backgroundColor: '#aaa', width: '100%' }} src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Babylonian_numerals.svg/640px-Babylonian_numerals.svg.png" alt="Babylonian numbers from " />
          // <p>historically understood as 1/86400th of a day, 1 SI second is <em>"defined as being equal to the time duration of 9 192 631 770 periods of the radiation corresponding to the transition between the two hyperfine levels of the fundamental unperturbed ground-state of the caesium-133 atom"</em>.</p>

//          <p>before the time of fast long distance travel (think: trains), the measurements of time at different places didn't need to be synchronized. the middle of the day was simply the time when the sun stood highest in the sky, what time of day it was at other places at other longitudes was of no relevance.</p>


export default App;

