"""Generate the original BlackSite CC0 environment bank, without source recordings."""
from pathlib import Path
import array, hashlib, json, math, random, wave

DEST = Path(__file__).resolve().parent.parent / 'assets' / 'environment-audio'
DEST.mkdir(parents=True, exist_ok=True)
RATE = 22050
NAMES = ['concrete-1','concrete-2','metal-1','metal-2','dirt-1','dirt-2','gravel-1','gravel-2','door-open','door-close','metal-impact','crate-impact','equipment-impact','wind','rain','machinery']
manifest = []
for index, name in enumerate(NAMES):
    rng = random.Random(80500 + index * 117)
    loop = name in ('wind', 'rain', 'machinery')
    duration = 4 if loop else .75 if name.startswith('door') else .3
    samples = array.array('h'); low = 0
    for n in range(int(RATE * duration)):
        t = n / RATE; noise = rng.uniform(-1, 1); low = .94 * low + .06 * noise
        if name == 'wind': value = low * (.3 + .1 * math.sin(2 * math.pi * t / duration))
        elif name == 'rain': value = noise * .05 + low * .12
        elif name == 'machinery': value = .06 * math.sin(t * 2 * math.pi * 55) + .03 * math.sin(t * 2 * math.pi * 110) + low * .08
        elif name.startswith('door'):
            envelope = math.sin(math.pi * t / duration) ** .4
            value = envelope * (.07 * math.sin(2 * math.pi * (88 if name.endswith('open') else 65) * t) + low * .3) + noise * .2 * math.exp(-max(0, duration - t - .035) * 100)
        elif name.startswith('metal') or name.startswith('equipment'):
            value = math.exp(-t * 22) * (noise * .23 + .25 * math.sin(2 * math.pi * (380 + index * 25) * t) + .08 * math.sin(2 * math.pi * 911 * t))
        else:
            rough = .7 if name.startswith('gravel') else .45 if name.startswith('dirt') else .25
            value = math.exp(-t * (25 + index)) * (low * 1.4 + noise * rough + .18 * math.sin(2 * math.pi * (65 + index * 7) * t))
        # Smooth loop boundaries; different seeds give every surface unique audio.
        if loop: value *= min(1, t * 20, (duration - t) * 20)
        samples.append(round(max(-.8, min(.8, value)) * 32767))
    path = DEST / (name + '.wav')
    with wave.open(str(path), 'wb') as stream:
        stream.setnchannels(1); stream.setsampwidth(2); stream.setframerate(RATE); stream.writeframes(samples.tobytes())
    manifest.append({'file':path.name,'duration':duration,'sample_rate':RATE,'channels':1,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'seed':80500+index*117})
(DEST / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Generated {len(manifest)} distinct local WAVs: {sum((DEST/m["file"]).stat().st_size for m in manifest):,} bytes.')
