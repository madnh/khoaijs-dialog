(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        var dependencies = [
            'lodash',
            'khoaijs',
            'khoaijs-pre-options',
            'khoaijs-template',
            'khoaijs-waiter',
            '../dialog_button',
            '../dialog'
        ];
        require(dependencies, factory);
    } else {
        factory(root._, root.Khoai, root.PreOptions, root.Template, root.Waiter, root.DialogButton, root.Dialog);
    }
}(this, function (_, Khoai, PreOptions, Template, Waiter, DialogButton, Dialog) {
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