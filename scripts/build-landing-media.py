"""Build original interface illustrations and a clearly labelled animated walkthrough.

Requires ffmpeg with librsvg + libx264. No browser, account, or API data is used.
These are authored interface illustrations, not captured application screenshots.
"""
from pathlib import Path
from html import escape
import subprocess

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/landing/media'
WORK = ROOT / 'output/landing-media'
OUT.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)
GREEN, IVORY, INK, SAGE, MUTED = '#1b3b2b', '#f9f7f2', '#28382e', '#d9e6dc', '#647267'


def text(x, y, value, size=22, color=INK, weight=400):
    return f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" font-weight="{weight}" font-family="Inter,Arial,DejaVu Sans,sans-serif">{escape(value)}</text>'


def box(x, y, w, h, color='white', r=14, stroke='none'):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{color}" stroke="{stroke}"/>'


def check(x, y, selected=False):
    return box(x, y, 30, 30, GREEN if selected else 'white', 7, GREEN if selected else '#c2cfc0') + (f'<path d="M{x+8} {y+15} l5 5 10 -12" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' if selected else '')


def shell(title, subtitle, chapter):
    s = ['<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">']
    s += [box(0, 0, 1280, 720, IVORY, 0), box(32, 28, 1216, 664, 'white', 24, '#e0e5d9')]
    s += [box(32, 28, 210, 664, GREEN, 24), box(220, 28, 22, 664, GREEN, 0)]
    s += [text(58, 79, 'Habit Tracker', 23, '#f4f9ef', 600)]
    active_tab = {0: 1, 1: 0, 2: 2, 3: 3}[chapter]
    for i, label in enumerate(['Overview', 'My habits', 'Activity', 'Insights']):
        if i == active_tab:
            s.append(box(49, 122+i*61, 174, 44, '#c5ecca', 9))
        s.append(text(65, 151+i*61, label, 17, GREEN if i == active_tab else '#c4d7c7', 500))
    s += [text(59, 619, 'Example habit', 14, '#c5d9c9'), text(59, 644, 'No account connected', 12, '#c5d9c9')]
    s += [text(280, 75, 'ILLUSTRATED WALKTHROUGH', 12, '#688261', 600), text(1030, 75, f'CHAPTER {chapter+1} / 4', 12, MUTED)]
    s += [text(280, 127, title, 29, GREEN, 600), text(280, 163, subtitle, 17, MUTED)]
    s += [f'<line x1="280" y1="634" x2="1206" y2="634" stroke="#e8ebe2"/>', text(280, 664, 'Illustrated walkthrough · no account data', 14, MUTED)]
    for i in range(4):
        s.append(box(1020+i*43, 651, 30, 5, '#6d9166' if i == chapter else '#e5eadf', 2))
    return s


def make_scene(chapter, checked=False):
    titles = ['Make a routine your own.', 'One action. One check-in.', 'A record starts with a day.', 'Let your own history tell the story.']
    subtitles = ['Choose a habit and the days that fit your life.', 'Mark a habit complete when you have actually done it.', 'An unchecked day stays neutral. A check-in adds colour.', 'Activity and insights become useful as you keep checking in.']
    s = shell(titles[chapter], subtitles[chapter], chapter)
    if chapter == 0:
        s += [box(280, 197, 545, 405, '#f8f9f4', 15), text(310, 237, 'Habit name', 16, MUTED, 500), box(310, 254, 483, 56, 'white', 8, '#d8e0d2'), text(327, 290, 'Read 10 pages', 23, INK, 500), text(310, 346, 'Repeat on', 16, MUTED, 500)]
        for i, day in enumerate(['S', 'M', 'T', 'W', 'T', 'F', 'S']):
            selected = i in [1, 3, 5]
            s += [box(310+i*67, 367, 53, 48, GREEN if selected else 'white', 9, '#dbe3d5'), text(329+i*67, 399, day, 18, 'white' if selected else MUTED, 500)]
        s += [box(310, 464, 176, 48, GREEN, 9), text(340, 495, 'Add habit', 18, 'white', 500), text(310, 555, 'Example: reading on Monday, Wednesday and Friday.', 14, MUTED)]
        s += [text(870, 274, 'Start specific.', 25, GREEN, 600), text(870, 315, 'A small, clear action', 18, MUTED), text(870, 344, 'is easier to return to.', 18, MUTED), text(870, 406, 'Your schedule.', 25, GREEN, 600), text(870, 447, 'Choose days that work', 18, MUTED), text(870, 476, 'for your routine.', 18, MUTED)]
    elif chapter == 1:
        s += [box(280, 207, 926, 297, '#f8f9f4', 15), text(313, 250, 'Example habit', 15, MUTED), check(316, 287, checked), text(364, 310, 'Read 10 pages', 25, INK, 500), text(364, 344, 'Monday · Wednesday · Friday', 16, MUTED)]
        if checked:
            s += [box(316, 397, 367, 47, '#e2edda', 9), text(334, 427, 'Check-in recorded for this example', 17, '#416541', 500)]
        else:
            s += [text(316, 423, 'Complete the habit, then check it off.', 20, MUTED)]
        s += [text(309, 558, 'Your real check-ins are saved only after you sign in.', 18, MUTED)]
    elif chapter == 2:
        s += [box(280, 207, 926, 324, '#f8f9f4', 15), text(312, 248, 'How an activity square works', 20, INK, 500)]
        for i in range(10):
            col = GREEN if checked and i == 6 else '#e8eae4'
            s += [box(313+i*75, 282, 54, 54, col, 9)]
        s += [box(313, 382, 23, 23, '#e8eae4', 4), text(349, 401, 'No check-in', 17, MUTED), box(558, 382, 23, 23, GREEN, 4), text(594, 401, 'A day with a check-in', 17, MUTED)]
        s += [text(313, 471, 'Illustration of the colour scale, not a recorded history.', 17, MUTED), text(309, 578, 'Your active days and streaks come from your own account history.', 17, MUTED)]
    else:
        s += [box(280, 207, 926, 344, '#f8f9f4', 15), text(316, 255, 'Your progress belongs to you.', 27, GREEN, 600)]
        rows = [('Activity calendar', 'See the days you completed a habit.'), ('Active days & streaks', 'Understand how consistently you show up.'), ('Behaviour insights', 'Review patterns in your saved check-ins.')]
        for i, (title, detail) in enumerate(rows):
            yy=310+i*73
            s += [box(316, yy-23, 8, 42, '#a3c9a8', 4), text(344, yy, title, 20, GREEN, 500), text(344, yy+28, detail, 16, MUTED)]
        s += [text(312, 590, 'Sign in to begin. A new account starts with your own habits.', 18, MUTED)]
    return ''.join(s)+'</svg>'

assets = {'plan-routine.svg': (0,False), 'daily-check-in.svg': (1,True), 'activity-history.svg': (2,True)}
for name, scene in assets.items():
    (OUT/name).write_text(make_scene(*scene))

chapters = [(0,False,6), (1,False,2), (1,True,4), (2,False,2), (2,True,4), (3,False,6)]
segments=[]
for index,(chapter,checked,duration) in enumerate(chapters):
    svg=WORK/f'scene-{index}.svg'
    png=WORK/f'scene-{index}.png'
    mp4=WORK/f'segment-{index}.mp4'
    svg.write_text(make_scene(chapter,checked))
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(svg),'-frames:v','1',str(png)],check=True)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-i',str(png),'-t',str(duration),'-vf','fps=24,format=yuv420p','-c:v','libx264','-preset','fast','-crf','24','-an',str(mp4)],check=True)
    segments.append(mp4)
playlist=WORK/'segments.txt'
playlist.write_text(''.join(f"file '{part.as_posix()}'\n" for part in segments))
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(playlist),'-c','copy','-movflags','+faststart',str(OUT/'product-walkthrough.mp4')],check=True)
(OUT/'product-walkthrough-poster.png').write_bytes((WORK/'scene-0.png').read_bytes())
(OUT/'product-walkthrough.en.vtt').write_text('''WEBVTT

00:00.000 --> 00:06.000
Illustrated walkthrough, using an example habit and no account data. Choose a habit and the days you want to do it.

00:06.000 --> 00:08.000
This example habit is ready for a check-in. Mark it complete after you have done it.

00:08.000 --> 00:12.000
The example check-in is marked complete. Real check-ins are saved to your account after sign-in.

00:12.000 --> 00:14.000
In the activity calendar, days without check-ins stay neutral.

00:14.000 --> 00:18.000
A day with a check-in gains colour. This is an illustration of the scale, not a recorded history.

00:18.000 --> 00:24.000
Your activity calendar, active days, streaks and insights are built from your own history. Sign in to begin.
''')
print('Created 24-second illustrated walkthrough, poster, captions and three SVG illustrations.')
