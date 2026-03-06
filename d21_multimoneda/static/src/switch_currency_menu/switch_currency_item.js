import { DropdownItem } from "@web/core/dropdown/dropdown_item";
import { Component, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";

export class SwitchCurrencyItem extends Component {
    static template = "d21_multimoneda.SwitchCurrencyItem";
    static components = { DropdownItem };
    static props = {
        currency: {},
    };

    setup() {
        this.currencyService = useService("multi_currency");
        this.currencySelector = useState(this.env.currencySelector);
    }

    get isCurrencySelected() {
        return this.currencySelector.isCurrencySelected(this.props.currency.id);
    }

    get isCurrent() {
        return this.props.currency.id === this.currencyService.currentCurrency.id;
    }

    logIntoCurrency() {
        this.currencySelector.switchCurrency("loginto", this.props.currency.id);
    }

    toggleCurrency() {
        this.currencySelector.switchCurrency("toggle", this.props.currency.id);
    }
}
