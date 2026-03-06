/** @odoo-module **/

import { MonetaryField, monetaryField } from "@web/views/fields/monetary/monetary_field";
import { registry } from "@web/core/registry";
import { _t } from "@web/core/l10n/translation";

export class AutosaveMonetaryField extends MonetaryField {
    static template = MonetaryField.template;
    static props = {
        ...MonetaryField.props,
    };

    get inputOptions() {
        const options = super.inputOptions;
        const originalParse = options.parse;

        // Wrap parse to detect when a new value is committed (on blur/change),
        // then schedule an autosave.
        options.parse = (value) => {
            const parsed = originalParse(value);
            // Schedule save in the next microtask so the field update completes first
            Promise.resolve().then(() => this._autosave());
            return parsed;
        };

        return options;
    }

    async _autosave() {
        const { record } = this.props;
        if (record && record.isDirty) {
            try {
                await record.save();
            } catch (e) {
                // If save fails (e.g. validation), let Odoo handle the error normally
                console.warn("AutosaveMonetaryField: save failed", e);
            }
        }
    }
}

export const autosaveMonetaryField = {
    ...monetaryField,
    component: AutosaveMonetaryField,
    displayName: _t("Monetary (Autosave)"),
};

registry.category("fields").add("autosave_monetary", autosaveMonetaryField);
