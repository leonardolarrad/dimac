import { Dropdown } from "@web/core/dropdown/dropdown";
import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { DropdownGroup } from "@web/core/dropdown/dropdown_group";
import { registry } from "@web/core/registry";

import { Component, useChildSubEnv, useState } from "@odoo/owl";
import { symmetricalDifference } from "@web/core/utils/arrays";
import { useChildRef, useService } from "@web/core/utils/hooks";
import { SwitchCurrencyItem } from "./switch_currency_item";
import { useDropdownState } from "@web/core/dropdown/dropdown_hooks";
import { useHotkey } from "@web/core/hotkeys/hotkey_hook";

export class CurrencySelector {
    constructor(currencyService, dropdownState) {
        this.currencyService = currencyService;
        this.dropdownState = dropdownState;
        this.selectedCurrencyIds = currencyService.activeCurrencyIds.slice();
    }

    get hasSelectionChanged() {
        return (
            symmetricalDifference(this.selectedCurrencyIds, this.currencyService.activeCurrencyIds)
                .length > 0
        );
    }

    isCurrencySelected(currencyId) {
        return this.selectedCurrencyIds.includes(currencyId);
    }

    switchCurrency(mode, currencyId) {
        if (mode === "toggle") {
            if (this.selectedCurrencyIds.includes(currencyId)) {
                this._deselectCurrency(currencyId);
            } else {
                this._selectCurrency(currencyId);
            }
        } else if (mode === "loginto") {
            // In single-currency mode, clear all and set just this one
            this.selectedCurrencyIds.splice(0, this.selectedCurrencyIds.length);
            this._selectCurrency(currencyId, true);
            this.apply();
            this.dropdownState.close?.();
        }
    }

    apply() {
        this.currencyService.setCurrencies(this.selectedCurrencyIds);
    }

    reset() {
        this.selectedCurrencyIds = this.currencyService.activeCurrencyIds.slice();
    }

    selectAll() {
        if (this.selectedCurrencyIds.length > 0) {
            this.selectedCurrencyIds.splice(0, this.selectedCurrencyIds.length);
        } else {
            const newIds = Object.values(this.currencyService.availableCurrencies).map((c) => c.id);
            this.selectedCurrencyIds.splice(0, this.selectedCurrencyIds.length, ...newIds);
        }
    }

    _selectCurrency(currencyId, unshift = false) {
        if (!this.selectedCurrencyIds.includes(currencyId)) {
            if (unshift) {
                this.selectedCurrencyIds.unshift(currencyId);
            } else {
                this.selectedCurrencyIds.push(currencyId);
            }
        } else if (unshift) {
            const index = this.selectedCurrencyIds.findIndex((c) => c === currencyId);
            this.selectedCurrencyIds.splice(index, 1);
            this.selectedCurrencyIds.unshift(currencyId);
        }
    }

    _deselectCurrency(currencyId) {
        if (this.selectedCurrencyIds.includes(currencyId)) {
            this.selectedCurrencyIds.splice(this.selectedCurrencyIds.indexOf(currencyId), 1);
        }
    }
}

export class SwitchCurrencyMenu extends Component {
    static template = "d21_multimoneda.SwitchCurrencyMenu";
    static components = { Dropdown, DropdownItem, DropdownGroup, SwitchCurrencyItem };
    static props = {};

    setup() {
        this.dropdown = useDropdownState();
        this.currencyService = useService("multi_currency");

        this.currencySelector = useState(
            new CurrencySelector(this.currencyService, this.dropdown)
        );
        useChildSubEnv({ currencySelector: this.currencySelector });

        useHotkey("control+enter", () => this.confirm(), {
            bypassEditableProtection: true,
            isAvailable: () => this.currencySelector.hasSelectionChanged,
        });

        this.containerRef = useChildRef();
        this.navigationOptions = {
            hotkeys: {
                space: (index, items) => {
                    if (!items[index]) return;
                    if (items[index].el.classList.contains("o_switch_currency_item")) {
                        const currencyId = parseInt(items[index].el.dataset.currencyId);
                        this.currencySelector.switchCurrency("toggle", currencyId);
                    }
                },
                enter: (index, items) => {
                    if (!items[index]) return;
                    if (items[index].el.classList.contains("o_switch_currency_item")) {
                        const currencyId = parseInt(items[index].el.dataset.currencyId);
                        this.currencySelector.switchCurrency("loginto", currencyId);
                        this.dropdown.close();
                    } else {
                        items[index].select();
                    }
                },
            },
        };
    }

    get currenciesEntries() {
        return Object.values(this.currencyService.availableCurrencies).map((currency) => ({
            currency,
        }));
    }

    get selectAllClass() {
        if (
            this.currencySelector.selectedCurrencyIds.length >=
            Object.values(this.currencyService.availableCurrencies).length
        ) {
            return "btn-link text-primary";
        }
        return "btn-link text-secondary";
    }

    get selectAllIcon() {
        const totalAvailable = Object.values(this.currencyService.availableCurrencies).length;
        if (this.currencySelector.selectedCurrencyIds.length >= totalAvailable) {
            return "fa-check-square text-primary";
        } else if (this.currencySelector.selectedCurrencyIds.length > 0) {
            return "fa-minus-square-o";
        }
        return "fa-square-o";
    }

    handleDropdownChange(isOpen) {
        if (isOpen && this.containerRef.el) {
            const currentWidth = this.containerRef.el.getBoundingClientRect().width;
            this.containerRef.el.style.width = currentWidth + "px";
        }
    }

    confirm() {
        this.dropdown.close();
        this.currencySelector.apply();
    }

    get isSingleCurrency() {
        return Object.values(this.currencyService.availableCurrencies).length <= 1;
    }
}

export const systrayItem = {
    Component: SwitchCurrencyMenu,
};

registry.category("systray").add("SwitchCurrencyMenu", systrayItem, { sequence: 2 });
