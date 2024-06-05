# waveCanvas
A javascript audio player with options for waveforms and playlists

![screenshot](https://github.com/wouters/waveCanvas/assets/69932/35c9a477-896e-4f9a-9d56-7912db26082a)

# Usage


## Simple single player

```
<audio
  class="waveCanvas"
  type="audio/mpeg"
  src="concretesneaker-prettylady.mp3"></audio>
```

## Single audio player with waveforms

```
<audio
  class="waveCanvas"
  type="audio/mpeg"
  src="concretesneaker-letgetmoving.mp3"
  data-waveform="concretesneaker-letgetmoving.json"></audio>
```

## Playlist with waveforms

```
<ul class="waveCanvas">
    <li data-waveform="concretesneaker-inthemood.json">
        <a href="concretesneaker-inthemood.mp3">Concrete Sneaker - <strong>In The Mood</strong></a>
    </li>
    <li data-waveform="concretesneaker-unreal.json">
        <a href="concretesneaker-unreal.mp3">Concrete Sneaker - <strong>Unreal</strong></a>
    </li>
    <li data-waveform="concretesneaker-goodolddays.json">
        <a href="concretesneaker-goodolddays.mp3">Concrete Sneaker - <strong>Good Old Day</strong></a>
    </li>
</ul>
```





# Waveforms JSON

Waveforms are not generated from the audio file but need to be pre-generated.
This van be done using: https://github.com/bbc/audiowaveform

for example: ```audiowaveform -i 'in the mood.mp3' -o 01.json --pixels-per-second 100 --bits 16```

