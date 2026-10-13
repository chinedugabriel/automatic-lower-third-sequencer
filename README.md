# automatic-lower-third-sequencer

Automatic lower third sequencing scheduler for OBS Studio's animated lower thirds, with configurable display duration, initial delay, gaps, and repeat intervals.

<img width="349" height="1002" alt="Screenshot 2026-10-13 235542" src="https://github.com/user-attachments/assets/44b57669-406f-4fab-a193-535652d598f8" />


## Installation

1. Open the animated lower third folder.
2. Find the **lower thirds** folder.
3. Edit the `control-panel.html` file.
4. Copy the lower third sequencer code and paste it immediately before the closing `</script>` tag in `control-panel.html`.
5. Save the file and restart OBS Studio to apply the changes.

## Configuration

Once the script is installed, you can configure the following settings in the OBS control panel:

- **Initial Value:** Set the starting point for the sequence.
- **Display Duration:** Define how long each lower third remains on screen.
- **Gap:** Set the time pause between each lower third display.
- **Repeat Interval:** Define when the lower third sequence will **automatically repeat by itself** (e.g., repeating the full cycle automatically every 2 minutes, 20 minutes, or 30 minutes).
- 
<img width="189" height="171" alt="Screenshot 2026-10-13 232707" src="https://github.com/user-attachments/assets/b4a5d3c4-7884-44e8-a348-59cc20cd1051" />

## Usage

1. Open the OBS control panel, adjust your settings as needed, and turn on the Main settings.
2. Click **Start Sequence** to begin automatically displaying the lower thirds according to your schedule.
3. Click **Stop Sequence** at any time to halt the automation.
