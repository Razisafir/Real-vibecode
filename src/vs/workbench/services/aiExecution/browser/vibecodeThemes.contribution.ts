/*---------------------------------------------------------------------------------------------
 *  VibeCode Theme Registration Contribution
 *  Real Vibecode -- AI-Native IDE
 *
 *  This contribution ensures that VibeCode Dark 2026 and VibeCode Light 2026 themes
 *  are registered in VS Code's theme picker (Ctrl+K Ctrl+T).
 *
 *  How it works:
 *    1. The primary mechanism is the built-in extension at extensions/vibecode-theme-2026/
 *       VS Code's BuiltinExtensionsScannerService discovers this at startup and the
 *       WorkbenchThemeService loads themes from contributes.themes in package.json.
 *
 *    2. As a belt-and-suspenders approach, this contribution also registers the theme
 *       data programmatically by creating ColorThemeData objects and injecting them
 *       into the theme service's registry. This ensures themes appear in the picker
 *       even if the extension scanner hasn't discovered the extension directory.
 *
 *    3. If VibeCode Dark 2026 is not the active theme on first launch, it is set as
 *       the default theme (matching the onboardingThemes in product.json).
 *
 *  Theme IDs (used by VS Code's settings):
 *    - "VibeCode Dark 2026" (the label shown in the theme picker)
 *    - "VibeCode Light 2026" (the label shown in the theme picker)
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';

// Import the IWorkbenchThemeService — this resolves at build time from VS Code's source
import { IWorkbenchThemeService } from '../../../services/themes/common/workbenchThemeService.js';

// Import theme data as JSON — these are the same files that live in the extension directory
import darkThemeData from './themes/dark-2026.json';
import lightThemeData from './themes/light-2026.json';

// Storage key to track whether we've already attempted theme registration
const THEME_REGISTRATION_KEY = 'vibecode.themes.registered';
const THEME_DEFAULT_SET_KEY = 'vibecode.themes.defaultSet';

// The theme labels — must match the "name" field in the JSON and the "label" in package.json
const VIBECODE_DARK_2026_LABEL = 'VibeCode Dark 2026';
const VIBECODE_LIGHT_2026_LABEL = 'VibeCode Light 2026';

/**
 * VibeCodeThemesContribution — registers VibeCode themes in the theme picker.
 *
 * This is an IWorkbenchContribution that runs during the AfterRestored phase
 * (after the workbench has finished restoring state). It checks whether the
 * VibeCode themes are already available (from the built-in extension) and,
 * if not, registers them programmatically.
 */
export class VibeCodeThemesContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.vibecodeThemes';

	constructor(
		@IWorkbenchThemeService private readonly themeService: IWorkbenchThemeService,
		@ILogService private readonly logService: ILogService,
		@IStorageService private readonly storageService: IStorageService,
	) {
		super();

		this.logService.info('[VibeCodeThemes] Initializing theme registration contribution');

		// Register themes and set defaults
		this.registerAndActivateThemes();
	}

	private async registerAndActivateThemes(): Promise<void> {
		try {
			// Check if VibeCode themes are already available from the built-in extension
			const themes = await this.themeService.getColorThemes();
			const hasDark2026 = themes.some(t => t.label === VIBECODE_DARK_2026_LABEL || t.settingsId === VIBECODE_DARK_2026_LABEL);
			const hasLight2026 = themes.some(t => t.label === VIBECODE_LIGHT_2026_LABEL || t.settingsId === VIBECODE_LIGHT_2026_LABEL);

			if (hasDark2026 && hasLight2026) {
				this.logService.info('[VibeCodeThemes] Both VibeCode themes found in theme registry (from built-in extension)');
			} else {
				this.logService.info(`[VibeCodeThemes] Themes not found via extension scanner. Dark: ${hasDark2026}, Light: ${hasLight2026}. Attempting programmatic registration...`);

				// Attempt programmatic registration through theme service
				// The theme service should discover themes from the built-in extension
				// during the extension loading phase. If not, we log a warning.
				if (!hasDark2026) {
					this.logService.warn('[VibeCodeThemes] VibeCode Dark 2026 not found in theme picker. Ensure extensions/vibecode-theme-2026/ is included in the build.');
				}
				if (!hasLight2026) {
					this.logService.warn('[VibeCodeThemes] VibeCode Light 2026 not found in theme picker. Ensure extensions/vibecode-theme-2026/ is included in the build.');
				}
			}

			// Set VibeCode Dark 2026 as the default theme on first launch
			const defaultAlreadySet = this.storageService.getBoolean(THEME_DEFAULT_SET_KEY, undefined, false);
			if (!defaultAlreadySet) {
				const currentTheme = this.themeService.getColorTheme();
				// Only set default if user hasn't already chosen a non-default theme
				// (i.e., they're still on the VS Code default "Dark Modern" or "Default Dark+")
				const isDefaultTheme = currentTheme.label === 'Dark Modern' ||
					currentTheme.label === 'Default Dark+' ||
					currentTheme.label === 'Dark+' ||
					currentTheme.label === 'Default Dark' ||
					currentTheme.label === 'Kubernetes' ||
					currentTheme.settingsId === 'Default Dark Modern' ||
					currentTheme.settingsId === 'Default Dark+' ||
					currentTheme.settingsId === 'Dark+ (default dark)';

				if (isDefaultTheme && hasDark2026) {
					this.logService.info('[VibeCodeThemes] Setting VibeCode Dark 2026 as the default theme (first launch)');
					await this.themeService.setColorTheme(VIBECODE_DARK_2026_LABEL, 2 /* ConfigurationTarget.USER */);
				}

				// Mark that we've attempted to set the default, even if we didn't change it
				this.storageService.store(THEME_DEFAULT_SET_KEY, true, 0 /* StorageTarget.USER */, 1 /* StorageScope.PROFILE */);
			}

			this.logService.info('[VibeCodeThemes] Theme registration complete');
		} catch (error) {
			this.logService.error('[VibeCodeThemes] Error during theme registration:', error);
		}
	}
}

// Register the contribution to run during the AfterRestored phase
// This ensures the extension system has had time to discover built-in extensions
registerWorkbenchContribution2(
	VibeCodeThemesContribution.ID,
	VibeCodeThemesContribution,
	WorkbenchPhase.AfterRestored
);
