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
        this.toggleEnable(notice_data.data);
    }

    function _btn_event_dialog_toggle_pending(notice_data) {
        if (notice_data.data) {
            if (this.options.disable_on_pending) {
                this.toggleEnable(false);
            }
        } else {
            this.toggleEnable(true);
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
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        var dependencies = [
            'lodash',
            'jquery',
            'khoaijs',
            'khoaijs-event-emitter',
            'khoaijs-pre-options',
            'khoaijs-template',
            'dialog_button'
        ];
        define(dependencies, function (_, jQuery, Khoai, EventEmitter, PreOptions, Template, DialogButton) {
            var module = factory(_, jQuery, Khoai, EventEmitter, PreOptions, Template, DialogButton);

            Khoai.Dialog = module;
            root.Dialog = module;

            return module;
        });
    } else {
        // Browser globals
        var module = factory(
            root._,
            root.jQuery,
            root.Khoai,
            (root.Khoai && root.Khoai.EventEmitter) || root.EventEmitter,
            (root.Khoai && root.Khoai.PreOptions) || root.PreOptions,
            (root.Khoai && root.Khoai.Template) || root.Template,
            (root.Khoai && root.Khoai.DialogButton) || root.DialogButton
        );

        root.Khoai.Dialog = module;
        root.Dialog = module;
    }
}(this, function (_, jQuery, Khoai, EventEmitter, PreOptions, Template, DialogButton) {
    var version = '0.0.1';
    var constant = {
        PRE_OPTIONS_NAME: 'Khoai.Dialog',
        TEMPLATE_TYPE: 'Dialog',
        STATUS_INITIAL: 'initial',
        STATUS_OPENED: 'opened',
        STATUS_HIDING: 'hiding',
        STATUS_CLOSED: 'removed',

        TYPE_INFO: 'info',
        TYPE_SUCCESS: 'success',
        TYPE_PRIMARY: 'primary',
        TYPE_WARNING: 'warning',
        TYPE_DANGER: 'danger',

        SIZE_SMALL: 'small',
        SIZE_NORMAL: 'normal',
        SIZE_LARGE: 'large'
    };
    var _dialogs = {};

    function _default_closable_func(dialog_instance) {
        return dialog_instance.isEnable();
    }

    function _default_clickable_func(dialog_instance) {
        return dialog_instance.isEnable();
    }

    PreOptions.define(constant.PRE_OPTIONS_NAME, {
        title: 'Dialog',
        type: constant.TYPE_INFO,
        content: '',
        content_handler: null,
        template_name: '',
        template: {},
        size: constant.SIZE_NORMAL,
        classes: '',
        closable: _default_closable_func,
        clickable: _default_clickable_func
    });

    function resetDialog(id) {
        var data = {
            status: constant.STATUS_INITIAL,
            enabled: true,
            pending: false,
            loading: false,
            ajax_worker: null,
            template_instance: null
        };
        if (_dialogs.hasOwnProperty(id)) {
            data.template_instance = _dialogs[id].template_instance;
        }

        _dialogs[id] = data;
    }

    /**
     * Can add events to dialog by add events to option parameter field as 'events'
     * Add buttons via options parameter field as 'buttons'
     * @param {Object} [options] Dialog options
     * @constructor
     * @extend EventEmitter
     */
    function Dialog(options) {
        this.type_prefix = 'dialog';

        EventEmitter.call(this);

        this.options = PreOptions.get(constant.PRE_OPTIONS_NAME);

        this.closed_by = '';
        this.data = {};
        this.buttons = {};

        resetDialog(this.id);

        this.option(this.options);

        if (options) {
            if (options.hasOwnProperty('events') && options.events) {
                this.addListeners(options.events);
                delete options['events'];
            }

            if (options.hasOwnProperty('buttons') && options.buttons) {
                var self = this;

                _.each(options.buttons, function (button) {
                    self.attachButton(button);
                });

                options['buttons'] = null;
                delete options['buttons'];
            }

            this.option(options);
        }
    }

    Khoai.util.inherit(Dialog, EventEmitter);

    Khoai.util.defineConstant(Dialog, 'version', version);
    Khoai.util.defineConstant(Dialog, constant);

    /**
     * Setup default options
     * @param {{}} options
     */
    Dialog.globalOption = function (options) {
        PreOptions.update(Dialog.PRE_OPTIONS_NAME, options);
    };

    function updateDialogContentCallback(content) {
        if (_.isFunction(this.options.content_handler)) {
            content = this.options.content_handler(content, this);
        }
        this.emitEvent('content_loaded', content);
        this.updateContent(content);
    }

    Dialog.prototype.getContent = function () {
        if (_.isFunction(this.options.content)) {
            this.emitEvent('load_content');
            this.options.content = this.options.content(updateDialogContentCallback.bind(this), this);
        }

        if (_.isFunction(this.options.content_handler)) {
            return this.options.content_handler(this.options.content, this);
        }

        return this.options.content;
    };
    Dialog.prototype.updateContent = function (new_content) {
        this.options.content = new_content || this.options.content;
        new_content = this.getContent();

        if (this.isOpened()) {
            this.emitEvent('update_content', new_content);
        }
    };
    Dialog.prototype.setTemplate = function (template_instance) {
        if (!this.isIniting()) {
            throw new Error('Dialog is opened');
        }
        if (!(template_instance instanceof Template)) {
            throw new Error('Invalid Template instance');
        }

        if (_dialogs[this.id].template_instance) {
            _dialogs[this.id].template_instance.disconnect();
            _dialogs[this.id].template_instance = null;
        }

        template_instance.option(this.options.template);
        _dialogs[this.id].template_instance = template_instance;
        template_instance.connect(this);
    };

    /**
     * Get template instance
     * @returns {null|Template}
     */
    Dialog.prototype.getTemplate = function () {
        if (!_dialogs[this.id].template_instance) {
            if (!this.options.template_name) {
                var default_options = PreOptions.get(Dialog.PRE_OPTIONS_NAME);

                if (default_options.template_name && Template.hasTemplate(Dialog.TEMPLATE_TYPE, default_options.template_name)) {
                    this.options.template_name = default_options.template_name;
                } else {
                    var default_template = Template.defaultTemplate(Dialog.TEMPLATE_TYPE);

                    if (false !== default_template) {
                        this.options.template_name = default_template;
                        PreOptions.update(Dialog.PRE_OPTIONS_NAME, {
                            template_name: default_template
                        });
                    } else {
                        throw new Error('Dialog default template not found');
                    }
                }
            }


            this.setTemplate(Template.templateInstance(Dialog.TEMPLATE_TYPE, this.options.template_name));
        }

        return _dialogs[this.id].template_instance;
    };

    Dialog.prototype.option = function (name, value) {
        var option = Khoai.util.beObject.apply(Khoai, _.toArray(arguments));

        if (option.template_name) {
            this.setTemplate(Template.templateInstance(Dialog.TEMPLATE_TYPE, option.template_name));
        }
        if (option.template) {
            this.getTemplate().option(option.template);
        }

        _.extend(this.options, option);

        return this;
    };


    /**
     * Get dialog status
     * @returns {string|boolean}
     */
    Dialog.prototype.status = function () {
        if (_dialogs.hasOwnProperty(this.id)) {
            return _dialogs[this.id].status;
        }

        return false;
    };
    Dialog.prototype.isIniting = function () {
        return this.status() === Dialog.STATUS_INITIAL;
    };

    /**
     * Check if dialog status is: opened, showing or hiding
     * @returns {boolean}
     */
    Dialog.prototype.isOpened = function () {
        return -1 !== [Dialog.STATUS_OPENED, Dialog.STATUS_HIDING].indexOf(this.status());
    };
    /**
     * Check if dialog is showing
     * @returns {boolean}
     */
    Dialog.prototype.isVisibling = function () {
        return this.status() === Dialog.STATUS_OPENED;
    };

    /**
     * Check if dialog is hiding
     * @returns {boolean}
     */
    Dialog.prototype.isHiding = function () {
        return this.status() === Dialog.STATUS_HIDING;
    };
    /**
     * Check if dialog is closed
     * @returns {boolean}
     */
    Dialog.prototype.isClosed = function () {
        return this.status() === Dialog.STATUS_CLOSED;
    };
    /**
     * Check if dialog is enabled
     * @returns {boolean}
     */
    Dialog.prototype.isEnable = function () {
        return Boolean(_dialogs[this.id].enabled);
    };
    /**
     * Check if dialog is pending
     * @returns {boolean}
     */
    Dialog.prototype.isPending = function () {
        return Boolean(_dialogs[this.id].pending);
    };
    /**
     * Enable dialog when it is disabled
     * Emit events when enabled success:
     * - enabled:
     * - toggle_enable:
     *   + 0: true if change event is enable
     *
     * @returns {boolean} True on enable success, otherwise.
     */
    Dialog.prototype.enable = function () {
        if (!this.isEnable()) {
            _dialogs[this.id].enabled = true;

            this.emitEvent('enabled');
            this.emitEvent('toggle_enable', true);

            return true;
        }

        return false;
    };

    /**
     * Disable dialog when it is enabling
     * Emit events when disable success:
     * - disabled:
     * - toggle_enable:
     *   + 0: false if change event is disable
     *
     * @returns {boolean} True on disable success, otherwise.
     */
    Dialog.prototype.disable = function () {
        if (this.isEnable()) {
            _dialogs[this.id].enabled = false;

            this.emitEvent('disabled');
            this.emitEvent('toggle_enable', false);

            return true;
        }

        return false;
    };

    /**
     * Set pending status is pending
     * Emit events when change success:
     * - pending:
     * - toggle_pending:
     *   + 0: true if change to pending
     *
     * @returns {boolean} True on change success, otherwise.
     */
    Dialog.prototype.pending = function () {
        if (!this.isPending()) {
            _dialogs[this.id].pending = true;

            this.emitEvent('pending');
            this.emitEvent('toggle_pending', true);

            return true;
        }

        return false;
    };

    /**
     * Set pending status is resolved
     * Emit events when change success:
     * - resolved:
     * - toggle_pending:
     *   + 0: false if change to resolved
     *
     * @returns {boolean} True on change success, otherwise.
     */
    Dialog.prototype.resolved = function () {
        if (this.isPending()) {
            _dialogs[this.id].pending = false;

            this.emitEvent('resolved');
            this.emitEvent('toggle_pending', false);

            return true;
        }

        return false;
    };

    /**
     *
     * @param {DialogButton|object} button DialogButton instance or button options
     */
    Dialog.prototype.attachButton = function (button) {
        if (!(button instanceof DialogButton)) {
            if (_.isObject(button)) {
                button = new DialogButton(button);
            } else if ((_.isString(button) || _.isNumber(button)) && DialogButton.has(button)) {
                button = DialogButton.factory(button);
            } else {
                throw new Error('Invalid button');
            }
        }

        this.buttons[button.options.name] = button;
        button.listen(this);

        return button;
    };

    Dialog.prototype.attachMultiButtons = function (buttons) {
        var self = this;

        _.each(buttons, function (button) {
            self.attachButton(button);
        });
    };

    /**
     * Check if button exists
     * @param {string} name
     * @returns {boolean}
     */
    Dialog.prototype.hasButton = function (name) {
        return this.buttons.hasOwnProperty(name);
    };
    /**
     * Get button instance
     * @param {string} name Button name
     * @returns {DialogButton}
     * @throw Get unattached button
     */
    Dialog.prototype.getButton = function (name) {
        if (!this.hasButton(name)) {
            throw new Error('Get unattached button');
        }

        return this.buttons[name];
    };
    Dialog.prototype.removeButton = function (name) {
        if (!this.hasButton(name)) {
            throw new Error('Remove unattached button');
        }
        this.buttons[name].unlisten(this);
        delete this.buttons[name];
    };
    /**
     * Check if dialog is clickable
     * @returns {boolean}
     */
    Dialog.prototype.isClickable = function () {
        if (this.options.clickable) {
            if (_.isFunction(this.options.clickable)) {
                return this.options.clickable(this);
            }
            return Boolean(this.options.clickable);
        }

        return true;
    };
    Dialog.prototype.click = function (button_name) {
        if (this.isClickable() && this.hasButton(button_name)) {
            var button = this.getButton(button_name);

            button.click();
            this.emitEvent('clicked', button_name);
        }
        return false;
    };
    /**
     * Check if dialog is closeable
     * @returns {boolean}
     */
    Dialog.prototype.isCloseable = function () {
        if (this.isOpened()) {
            if (this.options.closable) {
                if (_.isFunction(this.options.closable)) {
                    return this.options.closable(this);
                }

                return Boolean(this.options.closable);
            }

            return true;
        }

        return false;
    };

    Dialog.prototype.open = function () {
        if (this.status() === Dialog.STATUS_INITIAL) {
            if (!_dialogs[this.id].template_instance) {
                this.getTemplate();
            }

            this.closed_by = '';
            _dialogs[this.id].status = Dialog.STATUS_OPENED;
            this.emitEvent('open');

            return true;
        }

        return false;
    };

    /**
     * Hide dialog
     * @returns {boolean}
     */
    Dialog.prototype.hide = function () {
        if (this.isVisibling()) {
            this.emitEvent('hide');
            _dialogs[this.id].status = Dialog.STATUS_HIDING;

            return true;
        }

        return false;
    };

    /**
     * Show dialog
     * @returns {boolean}
     */
    Dialog.prototype.show = function () {
        if (this.isHiding()) {
            this.emitEvent('show');
            _dialogs[this.id].status = Dialog.STATUS_OPENED;

            return true;
        }

        return false;
    };

    /**
     * Close dialog
     * Emit event:
     * - close
     * @param {boolean} [force] Force close dialog
     * @param {string} [by] close caller
     */
    Dialog.prototype.close = function (force, by) {
        if (!this.isClosed() && (force || this.isCloseable())) {
            by = by || '';
            this.emitEvent('close', force, by);

            resetDialog(this.id);

            _dialogs[this.id].status = Dialog.STATUS_CLOSED;
            this.closed_by = by;

            this.emitEvent('closed', force, by);
            this.reset();

            return true;
        }

        return false;
    };
    /**
     * Update closed by value
     * @param {string|DialogButton} button
     * @returns {boolean}
     */
    Dialog.prototype.setClosedBy = function (button) {
        if (this.isClosed()) {
            if (!button) {
                button = '';
            }

            if (button instanceof DialogButton) {
                button = button.getCloseKey();
            }

            if (!_.isString(button)) {
                button += '';
            }

            this.closed_by = button;

            return true;
        }

        return false;
    };
    /**
     * Check if a button was close dialog
     * @param {string|DialogButton} button
     * @returns {boolean}
     */
    Dialog.prototype.isClosedBy = function (button) {
        if (this.isClosed()) {
            if (!button) {
                button = '';
            }

            if (button instanceof DialogButton) {
                button = button.getCloseKey();
            }

            if (!_.isString(button)) {
                button += '';
            }

            return this.closed_by === button;
        }

        return false;
    };

    Dialog.prototype.getDOM = function () {
        if (_dialogs[this.id].template_instance && (_dialogs[this.id].template_instance instanceof Template)) {
            return _dialogs[this.id].template_instance.getDOM();
        }

        return false;
    };


    return Dialog;
}));
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        var dependencies = [
            'lodash',
            'jquery',
            'khoaijs',
            'khoaijs-pre-options',
            'khoaijs-ajax',
            '../dialog-button',
            '../dialog'
        ];
        require(dependencies, factory);
    } else {
        factory(
            root._,
            root.jQuery || root.$,
            root.Khoai,
            (root.Khoai && root.Khoai.PreOptions) || root.PreOptions,
            (root.Khoai && root.Khoai.Ajax) || root.Ajax,
            (root.Khoai && root.Khoai.DialogButton) || root.DialogButton,
            (root.Khoai && root.Khoai.Dialog) || root.Dialog
        );
    }
}(this, function (_, jQuery, Khoai, PreOptions, Ajax, DialogButton, Dialog) {
    /*
     |--------------------------------------------------------------------------
     | Dynamic content
     |--------------------------------------------------------------------------
     |
     |
     |
     |
     */

    Khoai.util.defineConstant(Dialog, {
        DYNAMIC_CONTENT_PRE_OPTIONS_NAME: 'Khoai.Dialog.DynamicContent'
    });
    PreOptions.define(Dialog.DYNAMIC_CONTENT_PRE_OPTIONS_NAME, {
        loading: 'Loading content...'
    });


    /**
     * Return content as function which provide dynamic content via Ajax.
     * Change dialog's pending status on start complete request
     * Dialog will emit events:
     * - load_content: Ajax begin request
     * - load_content_failed: Ajax error
     * - load_content_complete: Ajax complete
     *
     * @param {Object} options Ajax options. Default options:
     * - error_content: default error content if Ajax error. 'Get dynamic content failed'
     * - loading: default loading content. 'Loading content...'.
     *
     * @returns {Function}
     */
    Dialog.dynamicContent = function (options) {
        var content = null;

        if (_.isString(options)) {
            options = {
                url: options
            }
        }

        options = PreOptions.get(Dialog.DYNAMIC_CONTENT_PRE_OPTIONS_NAME, options);

        return function (update_content_cb, dialog) {
            if (!_.isNull(content)) {
                return content;
            }

            var aw = new Ajax(_.omit(options, 'loading'));

            aw.done(function (response) {
                content = response + '';
                update_content_cb(content);
            });

            aw.fail(function () {
                dialog.emitEvent('load_content_failed');
                update_content_cb(options.error_content || 'Get dynamic content failed');
            });

            aw.option('before_send', function () {
                dialog.emitEvent('load_content');
                dialog.pending();

                return true;
            });

            aw.always(function () {
                dialog.emitEvent('load_content_complete');
                dialog.resolved();
            });

            dialog.addListener('close', function () {
                aw.abort();
            });

            aw.request();

            return options.loading;
        }
    };

    /*
     |--------------------------------------------------------------------------
     | Dialog Box
     |--------------------------------------------------------------------------
     |
     | Show only dialog body, no header, no footer
     |
     |
     */

    Dialog.box = function (content, options) {
        options = options || {};

        if (_.isString(options)) {
            options = {
                title: options + ''
            }
        }

        options.content = content;

        if (!options.template) {
            options.template = {};
        }

        options.template = _.defaults(options.template, {
            has_footer: false,
            has_header: false,
            close_manual: false
        });

        var dialog = new Dialog(options);

        dialog.open();

        return dialog;
    };

    /*
     |--------------------------------------------------------------------------
     | Dialog Alert
     |--------------------------------------------------------------------------
     |
     |
     |
     |
     */

    Khoai.util.defineConstant(Dialog, {
        DIALOG_ALERT_PRE_OPTIONS_NAME: 'Khoai.Dialog.Alert'
    });
    PreOptions.define(Dialog.DIALOG_ALERT_PRE_OPTIONS_NAME, {
        title: 'Alert',
        close_button_options: {}
    });


    /**
     *
     * @param {string} message
     * @param {string|object} options String: title, object: options
     * @returns {*|Dialog}
     */
    Dialog.alert = function (message, options) {
        if (_.isString(options)) {
            options = {
                title: options + ''
            }
        }

        options = _.extend({
            title: 'Alert'
        }, PreOptions.get(Dialog.DIALOG_ALERT_PRE_OPTIONS_NAME, options), {
            content: message
        });

        var dialog = new Dialog(_.omit(options, 'close_button_options'));

        dialog.attachButton(DialogButton.factory(DialogButton.CLOSE, options.close_button_options));

        dialog.open();

        return dialog;
    };


    /*
     |--------------------------------------------------------------------------
     | Dialog Confirm
     |--------------------------------------------------------------------------
     |
     |
     |
     */
    Khoai.util.defineConstant(Dialog, {
        DIALOG_CONFIRM_PRE_OPTIONS_NAME: 'Khoai.Dialog.Confirm'
    });
    PreOptions.define(Dialog.DIALOG_CONFIRM_PRE_OPTIONS_NAME, {
        title: 'Confirm',
        default_button: null,
        buttons: []
    });

    /**
     *
     * @param message
     * @param callback
     * @param options
     * @returns {*|Dialog}
     */
    Dialog.confirm = function (message, callback, options) {
        var dialog;

        if (!_.isObject(options)) {
            options = {
                title: options + ''
            }
        }
        if (!_.isFunction(callback)) {
            callback = _.noop;
        }

        options = _.extend(PreOptions.get(Dialog.DIALOG_CONFIRM_PRE_OPTIONS_NAME, options), {
            content: message
        });

        if (_.isEmpty(options.buttons)) {
            options.buttons = DialogButton.factory(DialogButton.BUTTONS_YES_NO);
        }

        dialog = new Dialog(_.omit(options, 'default_button'));

        _.each(dialog.buttons, function (button) {
            button.setHandler(function () {
                this.closeDialog();
                callback(this.options.name);
            });
        });

        if (!options.default_button) {
            options.default_button = _.last(Object.keys(dialog.buttons));
        }

        //Default button
        dialog.on('closed', function () {
            if (!this.closed_by) {
                Khoai.util.callFunc(callback, options.default_button, null);
            }
        }, {
            key: 'default_button'
        });

        dialog.open();

        return dialog;
    };


    /*
     |--------------------------------------------------------------------------
     | Dialog iFrame
     |--------------------------------------------------------------------------
     |
     |
     |
     */
    Khoai.util.defineConstant(Dialog, {
        DIALOG_IFRAME_PRE_OPTIONS_NAME: 'Khoai.Dialog.iFrame'
    });
    PreOptions.define(Dialog.DIALOG_IFRAME_PRE_OPTIONS_NAME, {
        title: 'iFrame',
        attributes: {}
    });
    /**
     *
     * @param url
     * @param options
     * @returns {*|Dialog}
     */
    Dialog.iFrame = function (url, options) {
        var dialog,
            attrs = [],
            template = [];

        if (!_.isObject(options)) {
            options = {
                title: options + ''
            }
        }

        options = PreOptions.get(Dialog.DIALOG_IFRAME_PRE_OPTIONS_NAME, options);

        _.each(options.attributes, function (val, key) {
            if (_.isBoolean(val)) {
                if (val) {
                    attrs.push(key + '="' + key + '"');
                }
            } else {
                attrs.push(key + '="' + val + '"');
            }
        });

        template.push('<div class="embed-responsive embed-responsive-16by9">');
        template.push('<iframe class="embed-responsive-item" src="' + url + '" ' + attrs.join(' ') + '></iframe>');
        template.push('</div>');

        options.content = template.join("\n");
        dialog = new Dialog(options);

        dialog.open();

        return dialog;
    };

    /*
     |--------------------------------------------------------------------------
     | Dialog Form
     |--------------------------------------------------------------------------
     | - Buttons: submit, close
     | - Options:
     |  + form_classes: form classes, string or array of string
     |  + message_classes: form message div classes, string or array of string. Default is "dialog_form_message"
     |  + buttons: add other buttons
     |  + buttons_option: object with button's name and button options
     |  + submit_button: default submit button name. Dialog will trigger callback with this button when the form is submit without button click
     |  + close_button: default close button name. Dialog will trigger callback with dialog close without button click
     |  + validator: form validator callback. Return true on valid or string for errors. If return string then dialog will show error on message div.
     |      Arguments:
     |      - form DOM
     |      - button instance
     |      - dialog instance
     |
     |
     |- Dialog data:
     |  + form_selector: form selector
     |  + form_message_selector: form message div selector
     |  + update_message: update form message. Arguments: message. If arg message fail then hide message
     |  + btn_handler: default button click handler, that valid form, show message on error and call callback.
     |      If button is close button then close dialog before call callback. Useful for custom button
     |      Arguments:
     |      - btn: button instance
     |
     |- Form callback:
     |      Arguments:
     |      - button name:
     |      - form DOM:
     |      - button instance:
     |      - dialog instance:
     |
     |
     |
     |
     |
     */
    DialogButton.define('submit', {
        label: 'Submit'
    });

    Khoai.util.defineConstant(DialogButton, {
        SUBMIT: 'submit',
        SUBMIT_CANCEL: ['submit', 'cancel']
    });

    Khoai.util.defineConstant(Dialog, {
        DIALOG_FORM_PRE_OPTIONS_NAME: 'Khoai.Dialog.Form'
    });
    PreOptions.define(Dialog.DIALOG_FORM_PRE_OPTIONS_NAME, {
        title: 'Form',
        form_classes: '',
        message_classes: 'dialog_form_message',
        validator: null,
        auto_focus: true,
        submit_button_name: 'submit',
        cancel_button_name: 'cancel',
        buttons: [],
        buttons_extend_options: {}
    });
    /**
     *
     * @param {(string|function)} content
     * @param {function} callback Callback arguments: button name, form DOM, button instance, dialog instance
     * @param options
     * @returns {*|Dialog}
     */
    Dialog.form = function (content, callback, options) {
        var dialog = new Dialog();

        if (!_.isFunction(callback)) {
            callback = _.noop;
        }
        options = _.extend(PreOptions.get(Dialog.DIALOG_FORM_PRE_OPTIONS_NAME, options), {
            content: content,
            content_handler: dialogFormContentHandler
        });

        if (_.isEmpty(options.buttons)) {
            options.buttons = DialogButton.factory(DialogButton.SUBMIT_CANCEL, {}, {
                cancel: {
                    handler: createCancelButtonHandler(callback)
                },
                submit: {
                    handler: createButtonsHandler(callback, options)
                }
            });
        }

        dialog.option(
            _.omit(options, ['form_classes', 'message_classes', 'validator', 'submit_button_name',
                'cancel_button_name', 'buttons', 'buttons_extend_options'])
        );

        _.each(options.buttons, function (button) {
            var attached_button = dialog.attachButton(button);

            if (options.buttons_extend_options.hasOwnProperty(attached_button.options.name)) {
                attached_button.option(_.clone(options.buttons_extend_options[attached_button.options.name]));
            }
        });

        addDialogData(dialog, options);
        addDialogMethods(dialog, options);
        addDialogEvents(dialog, options);

        dialog.open();

        if (options.auto_focus) {
            setTimeout(function () {
                dialog.getDOM().find('input:visible, textarea:visible').first().focus();
            }, 500);
        }

        return dialog;
    };

    function createCancelButtonHandler(callback) {
        return function (button) {
            var dialog = button.getDialog();

            button.closeDialog(true);
            Khoai.util.callFunc(callback, [button.options.name, null, button, dialog], dialog);
        }
    }

    function createButtonsHandler(callback, options) {
        return function (button) {
            var dialog_instance = this.getDialog(),
                form = jQuery(dialog_instance.data['form_selector']),
                validate_result = true;

            updateFormMessage(dialog_instance, false);

            if (options.validator) {
                validate_result = options.validator(form, dialog_instance);
            }
            if (true !== validate_result) {
                if (_.isString(validate_result)) {
                    updateFormMessage(dialog_instance, validate_result);
                }

                return;
            }

            Khoai.util.callFunc(callback, [button.options.name, form, button, dialog_instance], dialog_instance);
        }
    }

    function dialogFormContentHandler(content) {
        return ['<form><div class="dialog_form_message"></div>', content, '<input type="submit" style="display: none;"/></form>'].join('');
    }

    function classesToSelector(classes) {
        if (!_.isArray(classes)) {
            (classes + '').split(' ');
        }
        classes = _.flatten(_.castArray(classes));

        if (!_.isEmpty(classes)) {
            return _.map(classes, function (class_name) {
                return class_name.trim() ? '.' + class_name : '';
            }).join('');
        }

        return '';
    }

    function updateFormMessage(dialog, message) {
        var message_dom = jQuery(dialog.data['form_selector'] + ' ' + dialog.data['form_message_selector']);

        if (message_dom.length) {
            if (message) {
                message_dom.html(message).show();
            } else {
                message_dom.html('').hide();
            }
        }
    }

    function addDialogData(dialog, options) {
        var dialog_dom_id = '#' + dialog.getTemplate().getDOMID();
        var form_selector = dialog_dom_id + ' form' + classesToSelector(options.form_classes);
        var form_message_selector = form_selector + ' ' + options.message_classes ? classesToSelector(options.message_classes) : '.dialog_form_message';

        dialog.data['form_selector'] = form_selector;
        dialog.data['form_message_selector'] = form_message_selector;
    }

    function addDialogMethods(dialog) {
        dialog.getFormDOM = function () {
            return jQuery(dialog.data['form_selector']);
        };

        dialog.updateFormMessage = function (message) {
            updateFormMessage(dialog, message);
        };

        dialog.clearFormMessage = function () {
            updateFormMessage(dialog, false);
        };
        dialog.getFormData = function () {
            /**
             * @TODO: Fix Khoai.jForm
             */
            if (!Khoai.jForm) {
                console.warn('Method getFormData require module jForm');
                return {};
            }

            return Khoai.jForm.getFormData(this.getFormDOM());
        }
    }

    function addDialogEvents(dialog, options) {
        function form_submit_event_listener(event) {
            event.preventDefault();

            if (options.submit_button_name) {
                dialog.click(options.submit_button_name);
            }

            return false;
        }

        dialog.on('open', function () {
            jQuery('body').on('submit', this.data['form_selector'], form_submit_event_listener);
        });

        dialog.on('closed', function () {
            if (!this.closed_by && options.cancel_button_name) {
                if (!this.hasButton(options.cancel_button_name)) {
                    throw new Error('Invalid default button');
                }

                this.buttons[options.cancel_button_name].click();
            }
        }, {
            key: 'default_close_button'
        });

        dialog.on('closed', function () {
            jQuery('body').off('submit', this.data['form_selector'], form_submit_event_listener);
        });
    }


    /*
     |--------------------------------------------------------------------------
     | Dialog Prompt
     |--------------------------------------------------------------------------
     | - options:
     |      + value: current value
     |      + input_type: text, password,...
     |      + input_classes: class of input
     |
     | - callback: callback have 1 argument is value of prompt
     |
     */
    Khoai.util.defineConstant(Dialog, {
        DIALOG_PROMPT_PRE_OPTIONS_NAME: 'Khoai.Dialog.prompt'
    });
    PreOptions.define(Dialog.DIALOG_PROMPT_PRE_OPTIONS_NAME, {
        title: 'Prompt',
        default_value: '',
        placeholder: '',
        input_type: 'text',
        input_classes: 'form-control',
        buttons_extend_options: {
            submit: {
                label: 'Ok'
            }
        }
    });
    Dialog.prompt = function (message, callback, options) {
        var content = [],
            dialog;

        if (!_.isObject(options)) {
            options = {
                title: options + ''
            };
        }
        if (!_.isFunction(callback)) {
            callback = _.noop;
        }

        options = PreOptions.get(Dialog.DIALOG_PROMPT_PRE_OPTIONS_NAME, options);

        content.push('<p>', message, '</p>');
        content.push('<input name="prompt_data" type="', options.input_type + '" ',
            'class="', options.input_classes + '" ',
            'value="', options.default_value + '"',
            'placeholder="', options.placeholder + '"',
            '/>');

        function prompt_cb(btn_name, form, btn) {
            if (!form) {
                callback(false);
                return;
            }

            var value = options.default_value;

            if ('submit' === btn_name) {
                value = form.find('input[name="prompt_data"]').val();
                btn.closeDialog();
            }

            callback(value);
        }

        dialog = Dialog.form(content.join(''), prompt_cb, _.omit(options, 'default_value', 'placeholder', 'input_type', 'input_classes'));

        return dialog;
    };
}));