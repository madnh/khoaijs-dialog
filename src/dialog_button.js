(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        var dependencies = [
            'lodash',
            'khoaijs',
            'khoaijs-event-emitter',
            'khoaijs-pre-options',
            'khoaijs-template'
        ];
        define(dependencies, function (_, Khoai, EventEmitter, PreOptions, Template) {
            var module = factory(_, Khoai, EventEmitter, PreOptions, Template);

            Khoai.DialogButton = module;
            root.DialogButton = module;

            return module;
        });
    } else {
        var module = factory(
            root._,
            root.Khoai,
            root.Khoai.EventEmitter || root.EventEmitter,
            root.Khoai.PreOptions || root.PreOptions,
            root.Khoai.Template || root.Template
        );

        root.Khoai.DialogButton = module;
        root.DialogButton = module;
    }
}(this, function (_, Khoai, EventEmitter, PreOptions, Template) {
    var version = '0.0.1';
    var constant = {
        PRE_OPTIONS_NAME: 'Khoai.DialogButton',
        TEMPLATE_TYPE: 'DialogButton',
        TYPE_INFO: 'info',
        TYPE_PRIMARY: 'primary',
        TYPE_SUCCESS: 'success',
        TYPE_WARNING: 'warning',
        TYPE_DANGER: 'danger',

        OK: 'ok',
        CANCEL: 'cancel',
        YES: 'yes',
        NO: 'no',
        RETRY: 'retry',

        BUTTONS_OK_ONLY: ['ok'],
        BUTTONS_OK_CANCEL: ['ok', 'cancel'],
        BUTTONS_YES_NO: ['yes', 'no'],
        BUTTONS_YES_NO_CANCEL: ['yes', 'no', 'cancel'],
        BUTTONS_RETRY_CANCEL: ['retry', 'cancel']
    };
    var _buttons = {};

    PreOptions.define(constant.PRE_OPTIONS_NAME, {
        label: 'Untitled',
        icon: '',
        type: constant.TYPE_INFO,
        size: 1,
        handler: null,
        disable_on_pending: true,
        clickable: _default_clickable_cb,
        template_name: '',
        template: {}
    });
    function _default_clickable_cb(button) {
        return button.isVisible() && button.isEnable() && button.getDialog().isClickable();
    }

    function _init_btn(instance) {
        instance.addListener('listen', _btn_event_attached);
        instance.addListener('unlisten', _btn_event_detached);
        instance.addListener('dialog.toggle_enable', _btn_event_dialog_toggle_enable);
        instance.addListener('dialog.toggle_pending', _btn_event_dialog_toggle_pending);
    }

    function _btn_event_attached(dialog) {
        _buttons[this.id].dialog = dialog;
    }

    function _btn_event_detached(dialog) {
        _buttons[this.id].dialog = null;
    }

    function _btn_event_dialog_toggle_enable(notice_data) {
        this.toggleEnable(notice_data);
    }

    function _btn_event_dialog_toggle_pending(notice_data) {
        if (this.options.disable_on_pending) {
            this.toggleEnable(!notice_data);
        }
    }

    function DialogButton(option) {
        this.type_prefix = 'dialog_button';
        EventEmitter.call(this);

        this.options = PreOptions.get(constant.PRE_OPTIONS_NAME, {
            name: this.id
        });

        _buttons[this.id] = {
            dialog: null,
            enabled: true,
            visible: true,
            template_instance: null
        };

        this.option(this.options);

        if (option) {
            if (option.hasOwnProperty('events')) {
                this.addListeners(option.events);
                delete option['events'];
            }

            this.option(option);
        }

        _init_btn(this);
    }

    Khoai.util.inherit(DialogButton, EventEmitter);
    Khoai.util.defineConstant(DialogButton, 'version', version);
    Khoai.util.defineConstant(DialogButton, constant);

    /**
     *
     * @param {{}} options
     */
    DialogButton.globalOption = function (options) {
        PreOptions.update(DialogButton.PRE_OPTIONS_NAME, options);
    };

    DialogButton.prototype.setTemplate = function (template_instance) {
        if (!(template_instance instanceof Template)) {
            throw new Error('Invalid Template instance');
        }

        if (_buttons[this.id].template_instance) {
            _buttons[this.id].template_instance.disconnect();
            _buttons[this.id].template_instance = null;
        }

        template_instance.option(this.options.template);
        _buttons[this.id].template_instance = template_instance;
        template_instance.connect(this);
    };
    /**
     * Get template instance
     * @returns {null|*}
     */
    DialogButton.prototype.getTemplate = function () {
        if (!_buttons[this.id].template_instance) {
            if (!this.options.template_name) {
                var default_options = PreOptions.get(DialogButton.PRE_OPTIONS_NAME);

                if (default_options.template_name && Template.hasTemplate(DialogButton.TEMPLATE_TYPE, default_options.template_name)) {
                    this.options.template_name = default_options.template_name;
                } else {
                    var default_template = Template.defaultTemplate(DialogButton.TEMPLATE_TYPE);

                    if (false !== default_template) {
                        this.options.template_name = default_template;
                        PreOptions.update(DialogButton.PRE_OPTIONS_NAME, {
                            template_name: default_template
                        });
                    } else {
                        throw new Error('Dialog button default template not found');
                    }
                }
            }


            this.setTemplate(Template.templateInstance(DialogButton.TEMPLATE_TYPE, this.options.template_name));
        }

        return _buttons[this.id].template_instance;
    };
    DialogButton.prototype.option = function (name, value) {
        var option = Khoai.util.beObject.apply(Khoai, _.toArray(arguments));

        if (option.template_name) {
            this.setTemplate(Template.templateInstance(DialogButton.TEMPLATE_TYPE, option.template_name));
        }
        if (option.template) {
            this.getTemplate().option(option.template);
        }

        _.extend(this.options, _.omit(option, ['template_name']));

        return this;
    };

    DialogButton.prototype.setHandler = function (callback) {
        this.option('handler', callback);
    };

    /**
     * Get dialog instance
     * @returns {(Dialog|boolean)} False if not attach to dialog yet
     */
    DialogButton.prototype.getDialog = function () {
        if (_buttons[this.id].dialog) {
            return _buttons[this.id].dialog;
        }

        return false;
    };

    DialogButton.prototype.isClickable = function () {
        if (_.isFunction(this.options.clickable)) {
            return this.options.clickable.call(this, this);
        }

        return Boolean(this.options.clickable);
    };

    DialogButton.prototype.isVisible = function () {
        return Boolean(_buttons[this.id].visible);
    };
    DialogButton.prototype.isEnable = function () {
        return Boolean(_buttons[this.id].enabled);
    };

    /**
     * Click button
     * Emit events:
     * - click: run before button handler run
     * - clicked: rung after button handler run
     *
     * @returns {boolean}
     */
    DialogButton.prototype.click = function () {
        if (this.isClickable()) {
            this.emitEvent('click');
            if (this.options.handler) {
                Khoai.util.callFunc(this.options.handler, this, this);
            }
            this.emitEvent('clicked');

            return true;
        }

        return false;
    };
    /**
     * Show or hide button
     * Emit events:
     * - show/hide
     * - toggle: [is show?]
     * @param {boolean} show True or missing: show, False: hide
     */
    DialogButton.prototype.toggle = function (show) {
        if (_.isUndefined(show)) {
            show = !_buttons[this.id].visible;
        }

        if (_buttons[this.id].visible !== show) {
            _buttons[this.id].visible = show;
            if (show) {
                this.emitEvent('show');
            } else {
                this.emitEvent('hide');
            }

            this.emitEvent('toggle', show);
        }
    };
    DialogButton.prototype.show = function () {
        this.toggle(true);
    };
    DialogButton.prototype.hide = function () {
        this.toggle(false);
    };

    /**
     * Toggle enabled status
     * Emit events:
     * - enabled/disabled
     * - toggle_enabled: [is enabled?]
     * @param is_enable
     */
    DialogButton.prototype.toggleEnable = function (is_enable) {
        if (_.isUndefined(is_enable)) {
            is_enable = !_buttons[this.id].enabled;
        }

        if (_buttons[this.id].enabled !== is_enable) {
            _buttons[this.id].enabled = is_enable;
            this.emitEvent(is_enable ? 'enabled' : 'disabled');
            this.emitEvent('toggle_enable', is_enable);
        }
    };

    DialogButton.prototype.disable = function () {
        this.toggleEnable(false);
    };
    DialogButton.prototype.enable = function () {
        this.toggleEnable(true);
    };


    DialogButton.prototype.render = function () {
        return this.getTemplate().render();
    };


    /**
     * Refresh button DOM
     * @returns {boolean}
     */
    DialogButton.prototype.reDraw = function () {
        if (_buttons[this.id].template_instance) {
            return _buttons[this.id].template_instance.reDraw();
        }

        return false;
    };

    /**
     *
     * @returns {boolean}
     */
    DialogButton.prototype.getDOM = function () {
        if (_buttons[this.id].template_instance && (_buttons[this.id].template_instance instanceof Template)) {
            return _buttons[this.id].template_instance.getDOM();
        }

        return false;
    };
    /**
     *
     * @param name
     * @returns {DialogButton|null|*|Object|EventEmitter|Dialog}
     */
    DialogButton.prototype.getOtherButton = function (name) {
        return this.getDialog().getButton(name);
    };

    /**
     * Dialog close "by" key
     * @returns {string}
     */
    DialogButton.prototype.getCloseKey = function () {
        return this.options.name;
    };


    /**
     * Close dialog
     * @param force
     * @returns {boolean}
     */
    DialogButton.prototype.closeDialog = function (force) {
        var dialog = this.getDialog();

        if (dialog) {
            dialog.close(force, this.getCloseKey());

            return true;
        }

        return false;
    };

    /**
     * Check if dialog closed by this button
     * @returns {boolean}
     */
    DialogButton.prototype.wasCloseDialog = function () {
        var dialog = this.getDialog();

        if (dialog) {
            return dialog.setClosedBy(this);
        }

        return false;
    };

    /*
     |--------------------------------------------------------------------------
     | Static methods
     |--------------------------------------------------------------------------
     |
     |
     |
     |
     */

    var button_pre_options = {};

    DialogButton.isDefined = function (name) {
        return button_pre_options.hasOwnProperty(name);
    };

    DialogButton.define = function (name, options, freeze_options) {
        button_pre_options[name] = {
            options: _.isObject(options) ? options : {},
            freeze_options: _.isObject(freeze_options) ? freeze_options : {}
        };
        button_pre_options[name].freeze_options.name = name;
    };

    DialogButton.updateOptions = function (name, options) {
        if (DialogButton.isDefined(name)) {
            _.extend(button_pre_options[name].options, options);
            return true;
        }

        return false;
    };


    DialogButton.factory = function (types, all_button_options, button_options) {
        if (!_.isObject(all_button_options)) {
            all_button_options = {};
        }
        if (!_.isObject(button_options)) {
            button_options = {};
        }

        var buttons = _.castArray(types).map(function (type) {
            var options, type_options;

            if (!DialogButton.isDefined(type)) {
                throw new Error('Dialog Button type is unregistered');
            }

            type_options = button_pre_options[type];
            options = _.extend({},
                type_options.options,
                _.clone(all_button_options),
                button_options.hasOwnProperty(type) ? button_options[type] : {},
                type_options.freeze_options);

            return new DialogButton(options);
        });

        if (buttons.length === 1) {
            return buttons.shift();
        }

        return buttons;
    };

    DialogButton.defaultClickable = _default_clickable_cb;

    /*
     |--------------------------------------------------------------------------
     | Predefine button types
     |--------------------------------------------------------------------------
     |
     |
     |
     |
     */

    _.each(['Ok', 'Yes', 'No', 'Retry', 'Ignore'], function (label) {
        DialogButton.define(label.toLowerCase(), {
            label: label
        });
    });

    DialogButton.define('cancel', {
        label: 'Cancel',
        disable_on_pending: false
    });

    (function () {
        Khoai.util.defineConstant(DialogButton, {
            CLOSE: 'close'
        });

        function _close_dialog_handler(button) {
            var dialog = button.getDialog();

            if (dialog) {
                button.closeDialog(Boolean(button.options.force));
            }
        }

        DialogButton.define(DialogButton.CLOSE, {
            label: 'Close',
            type: DialogButton.TYPE_INFO,
            force: false
        }, {
            handler: _close_dialog_handler
        });
    })();


    return DialogButton;
}));