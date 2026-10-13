      
			/* =========================================================
			AUTOMATIC SEQUENCE SCHEDULER FOR ANIMATED LOWER THIRDS 

			Defaults:
			Initial delay:     30 minutes
			Display duration:  5 seconds
			Gap between panels: 3 minutes
			Repeat interval:   40 minutes
			========================================================= */

			(function () {
				'use strict';

				// Prevent accidental duplicate installation.
				if (document.getElementById('alt-scheduler-panel')) {
					return;
				}

				const schedulerPanel = document.createElement('section');

				schedulerPanel.id = 'alt-scheduler-panel';

				schedulerPanel.style.cssText = `
					margin: 12px 8px;
					padding: 12px;
					background: #252525;
					color: #f2f2f2;
					border: 1px solid #444;
					border-radius: 6px;
					font: 13px Arial, sans-serif;
				`;

				schedulerPanel.innerHTML = `
					<div style="
						font-size: 14px;
						font-weight: bold;
						margin-bottom: 10px;
					">
						Automatic Lower Third Sequence
					</div>

					<div style="
						display: grid;
						grid-template-columns: 1fr 100px;
						gap: 8px;
						align-items: center;
					">
						<label for="alt-scheduler-initial">
							Initial delay (minutes)
						</label>

						<input
							id="alt-scheduler-initial"
							type="number"
							min="0"
							step="1"
							value="30"
						>

						<label for="alt-scheduler-duration">
							Display duration (seconds)
						</label>

						<input
							id="alt-scheduler-duration"
							type="number"
							min="1"
							step="1"
							value="5"
						>

						<label for="alt-scheduler-gap">
							Gap between panels (minutes)
						</label>

						<input
							id="alt-scheduler-gap"
							type="number"
							min="0"
							step="0.5"
							value="3"
						>

						<label for="alt-scheduler-repeat">
							Repeat interval (minutes)
						</label>

						<input
							id="alt-scheduler-repeat"
							type="number"
							min="1"
							step="1"
							value="40"
						>
					</div>

					<div style="
						display: flex;
						gap: 8px;
						margin-top: 12px;
					">
						<button
							id="alt-scheduler-start"
							type="button"
						>
							Start Sequence
						</button>

						<button
							id="alt-scheduler-stop"
							type="button"
						>
							Stop Sequence
						</button>
					</div>

					<div
						id="alt-scheduler-status"
						role="status"
						style="
							margin-top: 10px;
							color: #b9d9ff;
							line-height: 1.4;
						"
					>
						Scheduler stopped.
					</div>

					<style>
						#alt-scheduler-panel input {
							box-sizing: border-box;
							width: 100%;
							min-width: 0;
							padding: 5px;
							background: #171717;
							color: #fff;
							border: 1px solid #666;
							border-radius: 3px;
						}

						#alt-scheduler-panel button {
							padding: 7px 12px;
							cursor: pointer;
							background: #3b3b3b;
							color: #fff;
							border: 1px solid #666;
							border-radius: 3px;
						}

						#alt-scheduler-panel button:disabled {
							opacity: 0.5;
							cursor: default;
						}
					</style>
				`;

				// Adds scheduler after the existing lower-thirds panel.
				const existingPanel = document.getElementById('alt-panel');

				if (existingPanel && existingPanel.parentNode) {
					existingPanel.parentNode.insertBefore(
						schedulerPanel,
						existingPanel.nextSibling
					);
				} else {
					document.body.insertBefore(
						schedulerPanel,
						document.body.firstChild
					);
				}

				const getElement = id => document.getElementById(id);

				const updateStatus = message => {
					getElement('alt-scheduler-status').textContent = message;
				};

				// Remember timing settings between dock reloads.
				['initial', 'duration', 'gap', 'repeat'].forEach(key => {
					const input = getElement('alt-scheduler-' + key);
					const savedValue = localStorage.getItem(
						'alt-scheduler-' + key
					);

					if (
						savedValue !== null &&
						savedValue !== '' &&
						Number.isFinite(Number(savedValue))
					) {
						input.value = savedValue;
					}

					input.addEventListener('change', () => {
						localStorage.setItem(
							'alt-scheduler-' + key,
							input.value
						);
					});
				});

				let running = false;
				let runToken = 0;
				let timeoutId = null;
				let pendingResolve = null;
				let savedState = null;

				/*
				* Wait for a specified duration.
				* The token allows Stop Sequence to cancel the current wait.
				*/
				function wait(milliseconds, token) {
					return new Promise(resolve => {
						pendingResolve = resolve;

						timeoutId = setTimeout(() => {
							timeoutId = null;
							pendingResolve = null;

							resolve(
								token === runToken && running
							);
						}, Math.max(0, milliseconds));
					});
				}

				/*
				* Activate or deactivate the original master switch.
				*/
				function setMaster(enabled) {
					const input = getElement(
						'lower-thirds-masterswitch'
					);

					if (!input || input.checked === enabled) {
						return;
					}

					if (window.jQuery) {
						window.jQuery(input)
							.prop('checked', enabled)
							.change();
					} else {
						input.checked = enabled;

						input.dispatchEvent(
							new Event('change', { bubbles: true })
						);
					}
				}

				/*
				* Use the original switches so the existing project
				* handles the normal lower-third activation events.
				*/
				function setPanel(number, enabled) {
					const input = getElement(
						'lower-thirds-switch' + number
					);

					if (!input || input.checked === enabled) {
						return;
					}

					if (window.jQuery) {
						window.jQuery(input)
							.prop('checked', enabled)
							.change();
					} else {
						input.checked = enabled;

						input.dispatchEvent(
							new Event('change', { bubbles: true })
						);
					}
				}

				function turnAllPanelsOff() {
					for (let number = 1; number <= 4; number++) {
						setPanel(number, false);
					}
				}

				/*
				* A panel is eligible only when both Name and Info
				* contain non-whitespace text.
				*/
				function getPopulatedPanels() {
					const populated = [];

					for (let number = 1; number <= 4; number++) {
						const name = getElement(
							'alt-' + number + '-name'
						);

						const info = getElement(
							'alt-' + number + '-info'
						);

						if (
							name &&
							info &&
							name.value.trim() !== '' &&
							info.value.trim() !== ''
						) {
							populated.push(number);
						}
					}

					return populated;
				}

				/*
				* Read and validate the timing values.
				*/
				function getSettings() {
					const read = key => Number(
						getElement('alt-scheduler-' + key).value
					);

					const initial = read('initial');
					const duration = read('duration');
					const gap = read('gap');
					const repeat = read('repeat');

					if (
						![initial, duration, gap, repeat]
							.every(Number.isFinite) ||
						initial < 0 ||
						duration < 1 ||
						gap < 0 ||
						repeat < 1
					) {
						throw new Error(
							'Enter valid timing values. Initial delay and gap ' +
							'cannot be negative; duration must be at least ' +
							'1 second; repeat interval must be at least ' +
							'1 minute.'
						);
					}

					return {
						initialMs: initial * 60_000,
						durationMs: duration * 1_000,
						gapMs: gap * 60_000,
						repeatMs: repeat * 60_000
					};
				}

				/*
				* Run one sequence, then repeat according to the
				* configured interval.
				*
				* The repeat interval is measured from the start
				* of one cycle to the start of the next.
				*/
				async function runScheduler(token, config) {
					const initialWaitFinished = await wait(
						config.initialMs,
						token
					);

					if (!initialWaitFinished || token !== runToken) {
						return;
					}

					while (running && token === runToken) {
						const cycleStartedAt = Date.now();

						const panels = getPopulatedPanels();

						if (panels.length === 0) {
							updateStatus(
								'No panels have both Name and Info. ' +
								'Will check again next cycle.'
							);
						} else {
							for (
								let index = 0;
								index < panels.length;
								index++
							) {
								if (!running || token !== runToken) {
									return;
								}

								const number = panels[index];

								// Check the fields again before displaying.
								const name = getElement(
									'alt-' + number + '-name'
								);

								const info = getElement(
									'alt-' + number + '-info'
								);

								if (
									!name ||
									!info ||
									!name.value.trim() ||
									!info.value.trim()
								) {
									continue;
								}

								// Display only the current scheduled panel.
								turnAllPanelsOff();
								setPanel(number, true);

								updateStatus(
									'Showing Lower Third ' +
									number +
									' (' +
									(index + 1) +
									' of ' +
									panels.length +
									').'
								);

								const displayFinished = await wait(
									config.durationMs,
									token
								);

								if (
									!displayFinished ||
									token !== runToken
								) {
									return;
								}

								setPanel(number, false);

								// Pause before the next populated panel.
								if (index < panels.length - 1) {
									const gapFinished = await wait(
										config.gapMs,
										token
									);

									if (
										!gapFinished ||
										token !== runToken
									) {
										return;
									}
								}
							}
						}

						if (!running || token !== runToken) {
							return;
						}

						const nextCycleAt =
							cycleStartedAt + config.repeatMs;

						const remainingTime = Math.max(
							0,
							nextCycleAt - Date.now()
						);

						updateStatus(
							'Cycle complete. Next cycle in approximately ' +
							Math.ceil(remainingTime / 60_000) +
							' minute(s).'
						);

						const repeatWaitFinished = await wait(
							remainingTime,
							token
						);

						if (
							!repeatWaitFinished ||
							token !== runToken
						) {
							return;
						}
					}
				}

				/*
				* Start the scheduler.
				*/
				function startSequence() {
					if (running) {
						return;
					}

					let config;

					try {
						config = getSettings();
					} catch (error) {
						updateStatus(error.message);
						return;
					}

					savedState = {
						master: getElement(
							'lower-thirds-masterswitch'
						)?.checked ?? false,

						panels: [1, 2, 3, 4].map(number => {
							const input = getElement(
								'lower-thirds-switch' + number
							);

							return input ? input.checked : false;
						})
					};

					running = true;
					runToken++;

					const token = runToken;

					getElement('alt-scheduler-start').disabled = true;
					getElement('alt-scheduler-stop').disabled = false;

					setMaster(true);
					turnAllPanelsOff();

					updateStatus(
						'Started. First sequence begins after ' +
						getElement('alt-scheduler-initial').value +
						' minute(s).'
					);

					runScheduler(token, config).catch(error => {
						updateStatus(
							'Scheduler error: ' + error.message
						);

						stopSequence(false);
					});
				}

				/*
				* Stop the scheduler and restore the original switch states.
				*/
				function stopSequence(restore = true) {
					running = false;
					runToken++;

					if (timeoutId !== null) {
						clearTimeout(timeoutId);
					}

					timeoutId = null;

					if (pendingResolve) {
						const resolve = pendingResolve;
						pendingResolve = null;
						resolve(false);
					}

					turnAllPanelsOff();

					if (restore && savedState) {
						savedState.panels.forEach(
							(checked, index) => {
								setPanel(index + 1, checked);
							}
						);

						setMaster(savedState.master);
					}

					savedState = null;

					getElement('alt-scheduler-start').disabled = false;
					getElement('alt-scheduler-stop').disabled = false;

					updateStatus('Scheduler stopped.');
				}

				getElement('alt-scheduler-start')
					.addEventListener('click', startSequence);

				getElement('alt-scheduler-stop')
					.addEventListener('click', () => {
						stopSequence(true);
					});

			})();
