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