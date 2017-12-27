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

            aw.option('beforeSend', function () {
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
        buttons_extend_options: {},
        disableable: false
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
        options = PreOptions.get(Dialog.DIALOG_FORM_PRE_OPTIONS_NAME, options);
        options = _.extend(options, {
            content: content,
            content_handler: dialogFormContentHandler(options)
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
                'cancel_button_name', 'buttons', 'buttons_extend_options', 'disableable'])
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

    function dialogFormContentHandler(options) {
        var wrap_begin = ['<form>'];
        var wrap_end = ['</form>'];

        if (options.disableable) {
            wrap_begin.push('<fieldset class="form_fieldset">');
            wrap_end.unshift('</fieldset>');
        }

        wrap_begin.push('<div class="dialog_form_message"></div>');
        wrap_end.unshift('<input type="submit" style="display: none;"/>');

        return function (content) {
            return wrap_begin.join("\n") + content + wrap_end.join("\n");
        };
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

        if(options.disableable){
            dialog.on('toggle_enable', function(){
                var form = this.getFormDOM();

                form.find('fieldset.form_fieldset').prop('disabled', !this.isEnable())
            })
        }
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
        close_on_submit: true,
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
                title: options ? options + '' : 'Prompt'
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
                callback(false, form, btn);
                return;
            }

            var value = options.default_value;

            if ('submit' === btn_name) {
                value = form.find('input[name="prompt_data"]').val();

                if (options.close_on_submit) {
                    btn.closeDialog();
                }
            }

            callback(value, form, btn);
        }

        dialog = Dialog.form(content.join(''), prompt_cb, _.omit(options, 'default_value', 'placeholder', 'input_type', 'input_classes', 'close_on_submit'));

        return dialog;
    };
}));