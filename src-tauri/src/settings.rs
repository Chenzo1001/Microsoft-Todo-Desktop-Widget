use crate::models::{SettingsDto, SettingsPatch};

pub fn apply_patch(mut settings: SettingsDto, patch: SettingsPatch) -> SettingsDto {
    if let Some(value) = patch.always_on_top {
        settings.always_on_top = value;
    }

    if let Some(value) = patch.opacity {
        settings.opacity = value.clamp(0.70, 1.0);
    }

    if let Some(value) = patch.sync_interval_minutes {
        settings.sync_interval_minutes = value.clamp(1, 60);
    }

    if let Some(value) = patch.autostart {
        settings.autostart = value;
    }

    if let Some(value) = patch.debug_mode {
        settings.debug_mode = value;
    }

    if let Some(value) = patch.show_completed {
        settings.show_completed = value;
    }

    if let Some(value) = patch.language {
        settings.language = match value.as_str() {
            "en" | "zh-CN" => value,
            _ => "system".to_string(),
        };
    }

    if let Some(value) = patch.font_family {
        settings.font_family = match value.as_str() {
            "compact" | "serif" | "mono" => value,
            _ => "system".to_string(),
        };
    }

    if let Some(value) = patch.font_scale {
        settings.font_scale = value.clamp(0.9, 1.2);
    }

    settings
}
