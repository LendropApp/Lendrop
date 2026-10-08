// Stepped frames → final MP4.
//
// The frames are a constant 30 fps sequence on the film's own clock. Each
// segment is trimmed between two marks (frame numbers) and sped up with
// setpts (form filling plays several times faster than it was typed); the
// segments are joined, resampled to 30 fps, and the last frame is held for
// one second.

import { join } from 'node:path'
import { spawnSync, execFileSync } from 'node:child_process'

let ffmpegPath
export function ffmpeg() {
  ffmpegPath ??= process.env.FFMPEG ??
    execFileSync('python', ['-c', 'import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())']).toString().trim()
  return ffmpegPath
}

/**
 * segments: [{ from: 'markA', to: 'markB', … }, …] in playback order, each
 * with at most one of:
 *   speed: 4     play four times faster
 *   fit: 1.0     sped up to last exactly this many seconds
 *   max: 0.4     sped up only if longer than this (network waits)
 * A segment's `to` may be 'end' (the last frame filmed).
 */
export function encode({ timeline, segments, out, freezeSeconds = 1 }) {
  const { fps, frames, dir, marks } = timeline
  if (!frames) throw new Error('no frames were recorded')
  const at = (label) => {
    const f = label === 'end' ? frames : marks[label]
    if (f == null) throw new Error(`unknown mark "${label}"`)
    return f
  }

  // A wait that resolved instantly leaves an empty segment; drop it.
  segments = segments.filter((s) => at(s.to) > at(s.from)).map((s) => {
    const secs = (at(s.to) - at(s.from)) / fps
    const speed = s.speed ?? (s.fit ? secs / s.fit : s.max ? Math.max(1, secs / s.max) : 1)
    return { ...s, secs, speed }
  })

  const n = segments.length
  const graph = [
    `[0:v]split=${n}${segments.map((_, i) => `[s${i}]`).join('')}`,
    ...segments.map((s, i) =>
      `[s${i}]trim=start_frame=${at(s.from)}:end_frame=${at(s.to)},setpts=(PTS-STARTPTS)/${s.speed}[v${i}]`),
    `${segments.map((_, i) => `[v${i}]`).join('')}concat=n=${n}:v=1:a=0,fps=30,` +
      `tpad=stop_mode=clone:stop_duration=${freezeSeconds},` +
      // The JPEG frames are full range, BT.601; players expect TV range, BT.709.
      `scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p[out]`,
  ].join(';')

  const res = spawnSync(ffmpeg(), [
    '-y', '-loglevel', 'error',
    '-framerate', String(fps), '-i', join(dir, '%05d.jpg'),
    '-filter_complex', graph, '-map', '[out]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-r', '30', '-pix_fmt', 'yuv420p',
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-an', '-movflags', '+faststart', out,
  ], { maxBuffer: 1 << 26 })
  if (res.status !== 0) throw new Error(`ffmpeg failed: ${res.stderr}`)

  for (const s of segments) {
    console.log(`  ${s.from} → ${s.to}: ${s.secs.toFixed(2)} s filmed, ×${s.speed.toFixed(2)} → ${(s.secs / s.speed).toFixed(2)} s`)
  }
  const planned = segments.reduce((t, s) => t + s.secs / s.speed, 0) + freezeSeconds
  return { planned, probe: probe(out) }
}

export function probe(file) {
  const res = spawnSync(ffmpeg(), ['-hide_banner', '-i', file], { encoding: 'utf8' })
  const dur = res.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/)
  const stream = res.stderr.match(/Video: .*/)?.[0] ?? ''
  return {
    seconds: dur ? +dur[1] * 3600 + +dur[2] * 60 + +dur[3] : null,
    stream,
  }
}

// A contact sheet (4 frames a second) for reviewing a cut.
export function contactSheet(file, png, cols = 5) {
  const { seconds } = probe(file)
  const rows = Math.ceil((seconds * 4) / cols)
  spawnSync(ffmpeg(), ['-y', '-loglevel', 'error', '-i', file, '-vf',
    `fps=4,scale=360:-1,tile=${cols}x${rows}`, '-frames:v', '1', png])
  return png
}
