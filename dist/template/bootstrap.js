(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        var dependencies = [
            'lodash',
            'jquery',
            'khoaijs',
            'khoaijs-pre-options',
            'khoaijs-template',
            'khoaijs-waiter',
            '../dialog'
        ];
        require(dependencies, factory);
    } else {
        factory(
            root._,
            root.jQuery || root.$,
            root.Khoai,
            (root.Khoai && root.Khoai.PreOptions) || root.PreOptions,
            (root.Khoai && root.Khoai.Template) || root.Template,
            (root.Khoai && root.Khoai.Waiter) || root.Waiter,
            (root.Khoai && root.Khoai.Dialog) || root.Dialog
        );
    }
}(this, function (_, jQuery, Khoai, PreOptions, Template, Waiter, Dialog) {
    var version = '0.0.1';

    Khoai.util.defineConstant(Dialog, {
        TEMPLATE_BOOTSTRAP_PRE_OPTIONS_NAME: 'Khoai.Dialog.Template.Bootstrap'
    });
    PreOptions.define(Dialog.TEMPLATE_BOOTSTRAP_PRE_OPTIONS_NAME, {
        has_header: true,
        has_footer: true,
        close_manual: true,
        padding: true,
        classes: '',
        overflow: 'hidden',
        buttons_align: 'right',
        pending_info: ''
    });

    var dialog_opening = 0;


    function _section_header(self, dialog, render_data) {
        var header_color = dialog.options.type ? 'bg-' + dialog.options.type : '';

        return '<div class="modal-header ' + header_color + '">' +
            '<button type="button" class="close" onclick="' + render_data.close_func + '()"><span aria-hidden="true">&times;</span></button>' +
            '<h4 class="modal-title">' + dialog.options.title + '</h4>' +
            '</div>';
    }

    function _section_body(self, dialog, render_data) {
        var content = dialog.getContent();
        var body_styles = [];

        if (!this.options.padding) {
            body_styles.push('padding: 0px;');
        }
        body_styles.push('overflow: ' + this.options.overflow + ';');

        return ['<div class="modal-body" style="', body_styles.join(' '), '">', content, '</div>'].join('');
    }

    function _section_footer(self, dialog, render_data) {
        var buttons = [];
        var template = '<div class="modal-footer" style="text-align: ' + this.options.buttons_align + ';">';
        var pending_info = '<span class="dialog-pending-info text-muted pull-' + (this.options.buttons_align === 'left' ? 'right' : 'left') + '">' + this.options.pending_info + '</span>&nbsp;&nbsp;';

        _.each(dialog.buttons, function (button) {
            buttons.push(button.render());
        });

        template += buttons.join("\n") + pending_info;
        template += '</div>';

        return template;
    }

    function _layout(self, dialog, render_data) {
        var size_class_map = {large: 'lg', small: 'sm'};
        var size = '';
        var layout = ['<div class="modal fade" tabindex="-1" role="dialog" id="<%= dom_id %>" data-dialog-id="', dialog.id, '" data-draw="<%- draw %>">'];


        if (size_class_map.hasOwnProperty(dialog.options.size)) {
            size = 'modal-' + size_class_map[dialog.options.size];
        }

        layout.push('<div class="modal-dialog ', this.options.classes, ' ', size, '">', '<div class="modal-content">');

        if (this.options.has_header) {
            layout.push('@HEADER@');
        }

        layout.push('@BODY@');

        if (this.options.has_footer) {
            layout.push('@FOOTER@');
        }

        layout.push('</div></div></div>');

        return layout.join('');
    }

    function getModalOption(close_manual) {
        return {
            backdrop: close_manual ? 'static' : true,
            keyboard: !close_manual
        }
    }

    function _open_dialog() {
        var modal_options = getModalOption(this.options.close_manual),
            dialog = this.getDialog(),
            data = {},
            template;

        data['close_func'] = Waiter.createFunc(function () {
            this.getDialog().close();
        }.bind(this), true, 'Modal: ' + dialog.id + ' >>> Header close button');

        this.waiter_keys.push(data['close_func']);

        template = this.render(data);

        jQuery('body').append(template);
        _setDialogDOMEvents(this);
        jQuery(this.getDOM()).modal(modal_options);
    }

    function _setDialogDOMEvents(instance) {
        var dom = jQuery(instance.getDOM());

        dom.on('show.bs.modal', function (event) {
            if (jQuery(event.target).is(dom)) {
                dialog_opening++;
                instance.emitEvent('show');
            }
        });

        dom.on('shown.bs.modal', function (event) {
            if (jQuery(event.target).is(dom)) {
                jQuery('body .modal-backdrop').last().attr('id', 'modal-backdrop_' + instance.id);
                instance.emitEvent('shown');
            }
        });

        dom.on('hide.bs.modal', function (event) {
            if (jQuery(event.target).is(dom)) {
                instance.emitEvent('hide');
            }
        });

        dom.on('hidden.bs.modal', function (event) {
            if (jQuery(event.target).is(dom)) {
                instance.emitEvent('hidden');
                instance.getDialog().close();
            }
        });
    }

    function update_dialog_close_status() {
        var closeable = this.getDialog().isCloseable();
        var modal_dom = jQuery(this.getDOM());

        modal_dom.find('.modal-header .close').toggleClass('hide', !closeable);

    }

    function Bootstrap() {
        if (!jQuery.fn.modal) {
            throw new Error('Dialog Bootstrap template require Bootstrap Modal to work');
        }

        this.type_prefix = 'template_dialog_bootstrap';

        Template.call(this);

        this.options = PreOptions.get(Dialog.TEMPLATE_BOOTSTRAP_PRE_OPTIONS_NAME);

        this.waiter_keys = [];
        this.setLayout(_layout);
        this.setSection('HEADER', _section_header.bind(this));
        this.setSection('BODY', _section_body.bind(this));
        this.setSection('FOOTER', _section_footer.bind(this));

        this.mimic(['open', 'toggle_enable', 'close', 'hide', 'show', 'update_content']);

        this.addListener('open', _open_dialog.bind(this));
        this.addListener('toggle_enable', update_dialog_close_status.bind(this));
        this.addListener('close', function () {
            Waiter.remove(this.waiter_keys);
            this.waiter_keys = [];
            this.getDOM().modal('hide');
            this.getDOM().remove();

            //Fix modal-open class on body
            dialog_opening = Math.max(0, --dialog_opening);
            jQuery('body').toggleClass('modal-open', dialog_opening > 0);

            if (!dialog_opening) {
                jQuery('body .modal-backdrop').remove();
            }
            jQuery('#modal-backdrop_' + this.id).remove();
        });
        this.addListener('hide', function () {
            this.getDOM().hide();
            jQuery('#modal-backdrop_' + this.id).hide();
        });
        this.addListener('show', function () {
            this.getDOM().show();
            jQuery('#modal-backdrop_' + this.id).show();
        });
        this.addListener('update_content', function (new_content) {
            if (this.getDialog().isOpened()) {
                this.updateContent(new_content);
            }
        });

    }

    Khoai.util.inherit(Bootstrap, Template);
    Khoai.util.defineConstant(Bootstrap, 'version', version);

    Bootstrap.prototype.getDOM = function () {
        var dom = this._super.getDOM.call(this);
        return jQuery(dom);
    };

    /**
     *
     * @returns {null|*|Object|EventEmitter|Dialog}
     */
    Bootstrap.prototype.getDialog = function () {
        return this.dataSource;
    };

    Bootstrap.prototype.updateContent = function (new_content) {
        if (!new_content) {
            new_content = this.getDialog().options.content;
        }

        jQuery(this.getDOM()).find('.modal-body').html(new_content);
    };

    Bootstrap.prototype.updatePendingInfo = function (info) {
        jQuery(this.getDOM()).find('.dialog-pending-info').html(info);
    };


    Template.register(Dialog.TEMPLATE_TYPE, 'Bootstrap', Bootstrap);
}));
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        var dependencies = [
            'lodash',
            'khoaijs',
            'khoaijs-pre-options',
            'khoaijs-template',
            'khoaijs-waiter',
            '../dialog_button'
        ];
        require(dependencies, factory);
    } else {
        factory(root._, root.Khoai, root.PreOptions, root.Template, root.Waiter, root.DialogButton);
    }
}(this, function (_, Khoai, PreOptions, Template, Waiter, DialogButton) {
    var version = '0.0.1';

    Khoai.util.defineConstant(DialogButton, {
        TEMPLATE_BOOTSTRAP_PRE_OPTIONS_NAME: 'Khoai.DialogButton.Template.Bootstrap'
    });

    PreOptions.define(DialogButton.TEMPLATE_BOOTSTRAP_PRE_OPTIONS_NAME, {
        icon_class: 'dialog_button_icon',
        label_class: 'dialog_button_label'
    });

    function _section_icon(instance, data_source, data) {
        if (data_source.options.icon) {
            return '<span class="<%= option.icon_class %>"><i class="<%= data_source.options.icon %>"></i></span>&nbsp;&nbsp;';
        }
        return '';
    }

    function _layout(instance, data_source, data) {
        var size = _.clamp(data_source.options.size - 1, 0, 4),
            padding_space = _.times(size * 3, _.constant('&nbsp;&nbsp;')).join(''),
            template = '',
            style = [];

        if (!data_source.isVisible()) {
            style.push('display: none');
        }

        template += '<button type="button" id="<%= dom_id %>" data-button-id="<%= data_source.id %>"';
        template += 'data-draw="<%- draw %>" style="' + style.join('; ') + '"';
        template += 'class="btn btn-<%= data_source.options.type %>" data-name="<%= data_source.options.name %>" ';
        template += 'onclick="' + instance.click_key + '()"';

        if (!data_source.isEnable()) {
            template += ' disabled="disabled"';
        }

        template += '>';
        template += padding_space + '@ICON@@LABEL@' + padding_space + '</button>';

        return template;
    }


    function Bootstrap() {
        this.type_prefix = 'template_dialog_button_bootstrap';
        Template.call(this);

        var self = this;

        this.options = PreOptions.get(DialogButton.TEMPLATE_BOOTSTRAP_PRE_OPTIONS_NAME);

        this.setLayout(_layout);
        this.setSection('ICON', _section_icon.bind(this));
        this.setSection('LABEL', '<span class="<%= option.label_class %>"><%= data_source.options.label %></span>');

        this.click_key = Waiter.createFunc(function () {
            self.getButton().click();
        });

        this.mimic(['toggle', 'toggle_enable']);

        this.addListener('toggle', function (noticed_data) {
            this.getDOM().toggle(noticed_data.data);
        });
        this.addListener('toggle_enable', function (noticed_data) {
            if (noticed_data) {
                this.getDOM().removeAttr('disabled');
            } else {
                this.getDOM().attr('disabled', 'disabled');
            }

            this.getDOM().prop('disabled', !noticed_data);
        });

    }

    Khoai.util.inherit(Bootstrap, Template);
    Khoai.util.defineConstant(Bootstrap, 'version', version);

    Bootstrap.prototype.getDOM = function () {
        var dom = this._super.getDOM.call(this);
        return jQuery(dom);
    };


    /**
     *
     * @returns {null|*|Object|EventEmitter|Dialog}
     */
    Bootstrap.prototype.getButton = function () {
        return this.dataSource;
    };

    Bootstrap.prototype.updateLabel = function (label) {
        this.getDOM().find('.' + this.options.label_class).html(label);
    };

    Bootstrap.prototype.updateIcon = function (icon) {

        this.getDOM().find('.' + this.options.icon_class).html('<i class="' + icon + '"></i>');
    };


    Template.register(DialogButton.TEMPLATE_TYPE, 'Bootstrap', Bootstrap);
}));