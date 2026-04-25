/** @odoo-module **/
// Componente HomeMenu: pantalla principal con grid de aplicaciones.
// Muestra los iconos de las apps instaladas en un grid responsivo,
// permite navegación por teclado y búsqueda vía Command Palette.
import { hasTouch } from "@web/core/browser/feature_detection";
import { useHotkey } from "@web/core/hotkeys/hotkey_hook";
import { useService } from "@web/core/utils/hooks";

import {
    Component,
    useExternalListener,
    onMounted,
    onPatched,
    onWillUpdateProps,
    useState,
    useRef,
} from "@odoo/owl";

export class HomeMenu extends Component {
    static template = "d21_menu.HomeMenu";
    static props = {
        apps: {
            type: Array,
            element: {
                type: Object,
                shape: {
                    actionID: Number,
                    href: String,
                    appID: Number,
                    id: Number,
                    label: String,
                    parents: String,
                    webIcon: {
                        type: [
                            Boolean,
                            String,
                            {
                                type: Object,
                                optional: 1,
                                shape: {
                                    iconClass: String,
                                    color: String,
                                    backgroundColor: String,
                                },
                            },
                        ],
                        optional: true,
                    },
                    webIconData: { type: String, optional: 1 },
                    xmlid: String,
                },
            },
        },
    };

    setup() {
        /** Configura el HomeMenu con servicios, hotkeys y refs. */
        this.command = useService("command");
        this.menus = useService("menu");
        this.homeMenuService = useService("home_menu");
        this.ui = useService("ui");
        this.state = useState({
            focusedIndex: null,
        });
        this.inputRef = useRef("input");
        this.rootRef = useRef("root");

        if (!this.env.isSmall) {
            this._registerHotkeys();
        }

        onWillUpdateProps(() => {
            this.state.focusedIndex = null;
        });

        onMounted(() => {
            if (!hasTouch()) {
                this._focusInput();
            }
        });

        onPatched(() => {
            if (this.state.focusedIndex !== null && !this.env.isSmall) {
                const selectedItem = document.querySelector(".o_home_menu .o_menuitem.o_focused");
                if (selectedItem) {
                    selectedItem.scrollIntoView({ block: "center" });
                }
            }
        });
    }

    get displayedApps() {
        /** Retorna la lista de aplicaciones a mostrar. */
        return this.props.apps;
    }

    get maxIconNumber() {
        /** Calcula el número máximo de iconos por fila según el ancho de pantalla. */
        const w = window.innerWidth;
        if (w < 576) {
            return 3;
        } else if (w < 768) {
            return 4;
        } else {
            return 6;
        }
    }

    _openMenu(menu) {
        /** Abre un menú/app seleccionado. */
        return this.menus.selectMenu(menu);
    }

    _updateFocusedIndex(cmd) {
        /** Actualiza el índice enfocado según el comando de navegación por teclado. */
        const nbrApps = this.displayedApps.length;
        const lastIndex = nbrApps - 1;
        const focusedIndex = this.state.focusedIndex;
        if (lastIndex < 0) {
            return;
        }
        if (focusedIndex === null) {
            this.state.focusedIndex = 0;
            return;
        }
        const lineNumber = Math.ceil(nbrApps / this.maxIconNumber);
        const currentLine = Math.ceil((focusedIndex + 1) / this.maxIconNumber);
        let newIndex;
        switch (cmd) {
            case "previousElem":
                newIndex = focusedIndex - 1;
                break;
            case "nextElem":
                newIndex = focusedIndex + 1;
                break;
            case "previousColumn":
                if (focusedIndex % this.maxIconNumber) {
                    newIndex = focusedIndex - 1;
                } else {
                    newIndex =
                        focusedIndex + Math.min(lastIndex - focusedIndex, this.maxIconNumber - 1);
                }
                break;
            case "nextColumn":
                if (focusedIndex === lastIndex || (focusedIndex + 1) % this.maxIconNumber === 0) {
                    newIndex = (currentLine - 1) * this.maxIconNumber;
                } else {
                    newIndex = focusedIndex + 1;
                }
                break;
            case "previousLine":
                if (currentLine === 1) {
                    newIndex = focusedIndex + (lineNumber - 1) * this.maxIconNumber;
                    if (newIndex > lastIndex) {
                        newIndex = lastIndex;
                    }
                } else {
                    newIndex = focusedIndex - this.maxIconNumber;
                }
                break;
            case "nextLine":
                if (currentLine === lineNumber) {
                    newIndex = focusedIndex % this.maxIconNumber;
                } else {
                    newIndex =
                        focusedIndex + Math.min(this.maxIconNumber, lastIndex - focusedIndex);
                }
                break;
        }
        if (newIndex < 0) {
            newIndex = lastIndex;
        } else if (newIndex > lastIndex) {
            newIndex = 0;
        }
        this.state.focusedIndex = newIndex;
    }

    _focusInput() {
        /** Enfoca el input de búsqueda si no estamos en móvil. */
        if (!this.env.isSmall && this.inputRef.el) {
            this.inputRef.el.focus({ preventScroll: true });
        }
    }

    _onAppClick(app) {
        /** Maneja el clic en una aplicación del grid. */
        this._openMenu(app);
    }

    _registerHotkeys() {
        /** Registra atajos de teclado para navegación en el grid de apps. */
        const hotkeys = [
            ["ArrowDown", () => this._updateFocusedIndex("nextLine")],
            ["ArrowRight", () => this._updateFocusedIndex("nextColumn")],
            ["ArrowUp", () => this._updateFocusedIndex("previousLine")],
            ["ArrowLeft", () => this._updateFocusedIndex("previousColumn")],
            ["Tab", () => this._updateFocusedIndex("nextElem")],
            ["shift+Tab", () => this._updateFocusedIndex("previousElem")],
            [
                "Enter",
                () => {
                    const menu = this.displayedApps[this.state.focusedIndex];
                    if (menu) {
                        this._openMenu(menu);
                    }
                },
            ],
            ["Escape", () => this.homeMenuService.toggle(false)],
        ];
        hotkeys.forEach((hotkey) => {
            useHotkey(...hotkey, { allowRepeat: true });
        });
        useExternalListener(window, "keydown", this._onKeydownFocusInput.bind(this));
    }

    _onKeydownFocusInput() {
        /** Redirige el foco al input de búsqueda si no está enfocado ningún campo de texto. */
        if (
            document.activeElement !== this.inputRef.el &&
            this.ui.activeElement === document &&
            !["TEXTAREA", "INPUT"].includes(document.activeElement.tagName)
        ) {
            this._focusInput();
        }
    }

    _onInputSearch() {
        /** Abre el Command Palette con el valor de búsqueda del input. */
        const onClose = () => {
            this._focusInput();
            if (this.inputRef.el) {
                this.inputRef.el.value = "";
            }
        };
        const searchValue = `/${this.inputRef.el.value.trim()}`;
        this.command.openMainPalette({ searchValue }, onClose);
    }

    _onInputBlur() {
        /** Restaura el foco al input si el usuario hizo clic en un área no interactiva. */
        if (hasTouch()) {
            return;
        }
        setTimeout(() => {
            if (document.activeElement === document.body && this.ui.activeElement === document) {
                this._focusInput();
            }
        }, 0);
    }
}
