frappe.ui.form.on('Sales Invoice', {
	onload: function(frm){
      reset_cancelled_form(frm);
	    estimate_print(frm);
			if(frm.doc.customer){
				frm.refresh_field('customer');
	 			// frm.trigger('customer');
				// frm.refresh_field('taxes_and_charges');
				// frm.trigger('taxes_and_charges');
				// frm.refresh_field('taxes');
			}
			frm.remove_custom_button('Fetch Timesheet');
			setTimeout(() => {
		      frm.remove_custom_button("Maintenance Schedule",'Create');
					frm.remove_custom_button("Subscription",'Create');
					frm.remove_custom_button("Invoice Discounting",'Create');
					frm.remove_custom_button("E-Way Bill JSON",'Create');
					frm.remove_custom_button("Quotation",'Get Items From');
					frm.remove_custom_button('Fetch Timesheet');
		    },10);
	},
	refresh: function(frm){
      reset_cancelled_form(frm);
	    estimate_print(frm);
			setTimeout(() => {
		    frm.remove_custom_button("Maintenance Schedule",'Create');
				frm.remove_custom_button("Subscription",'Create');
				frm.remove_custom_button("Invoice Discounting",'Create');
				frm.remove_custom_button("E-Way Bill JSON",'Create');
				frm.remove_custom_button("Quotation",'Get Items From');
				frm.remove_custom_button('Fetch Timesheet');
		  },10);
			// frm.get_field("items").grid.set_multiple_add("item_code", "qty");
			frappe.call({
					"method": "frappe.client.get",
					"args": {
							"doctype": "Company",
							"filters": {"company_name": frm.doc.company }
							},
					callback: function(r){
							if(r && r.message ){
									if(! r.message.is_group){
											frm.set_df_property('grand_total_amount', 'hidden', 0);
									}
									else{
										frm.set_df_property('grand_total_amount', 'hidden', 1);
									}
							}
					}
			});
	},
  validate: function(frm){
    update_batch_price(frm);
		calculate_taxable_amount(frm);
		frm.set_value("grand_total_amount", frm.doc.grand_total);
  },
	grand_total: function(frm){
		frm.set_value("grand_total_amount", frm.doc.grand_total);
	},
  search_item : function(frm){
		remove_empty_items(frm);
		if(!frm.doc.customer){
			frappe.throw(__('Select Customer before search'));
		}
		if(!frm.doc.selling_price_list){
			frappe.throw(__('Please set price list for customer'));
		}
		if(!frm.doc.set_warehouse){
			frappe.throw(__('Select Warehouse before search'));
		}
    search_item_button(frm);
  }
});

var check_drug_class_restrictions = function(frm, cdt, cdn){
    var child = locals[cdt][cdn];
    frappe.call({
       method: 'frappe.client.get',
       args: {
           'doctype': 'Drug Prescription Class',
           'filters': {'name': child.drug_prescription_class}
       },
       callback: function(r){
           console.log(r.message);
       }
    });
};

// var add_expiry_date = function(frm, cdt, cdn){
//     var child = locals[cdt][cdn];
//     frappe.call({
//        method: 'frappe.client.get',
//        args: {
//            'doctype': 'Batch',
//            'filters': {'batch_id': child.batch_no}
//        },
//        callback: function(r){
//           frappe.model.set_value(cdt, cdn,"expiry_date", r.message.expiry_date);
//        }
//     });
// };

function estimate_print(frm){
    if(frm.doc.status=="Draft" && !frm.is_new()){
        frm.add_custom_button(__("Estimate Print"), function() {
            frm.print_doc();
        });
    }
}

var search_items = function(frm, values) {
    if(values.search_field){
        frappe.call({
            "method": 'erpnext.accounts.doctype.sales_invoice.sales_invoice.check_superseded_item',
            "args": {
                    'item_name': values.search_field
            },
            callback: function(r){
                if(r && r.message){
                   frappe.msgprint({
                       title: __('Item Superseded'),
                       indicator: 'green',
                       message: __('Item '+ r.message.item_name +' is Superseded by '+ r.message.superseded_item_name )
                   });
                }
            }
       });
    }
	var new_item=[];
	frappe.call({
		"method": "erpnext.controllers.queries.search_item_contents",
		"args": {
			"filter_value": values.search_field,
			"drug_content": values.drug_contents,
			"warehouse": frm.doc.set_warehouse,
			"price_list": frm.doc.selling_price_list,
			"sales" : 1
		},
		callback: function(ret){
			// console.log(ret);
			if(ret && ret.message){
				new_items_popup(frm, ret.message);
			}
		}
	});
};

var search_item_button = function(frm){
	let d = new frappe.ui.Dialog({
    title: 'Search Items',
    fields: [
        {
            label: 'ITEM DETAILS',
            fieldname: 'search_field',
            fieldtype: 'Data'
        },
        {
            label:"CONTENT",
            fieldname: 'drug_contents',
            fieldtype: 'MultiSelectList',
            get_data: function(txt) {
							return frappe.db.get_link_options('Drug Content',txt);
						}
        }
    ],
    primary_action_label: 'Search',
        primary_action(values) {
            // console.log(values);
            d.hide();
            search_items(frm,values)
        }
		});
		d.show();
}

var new_items_popup = function(frm, new_items) {
    var d = new frappe.ui.Dialog({
        title:__("Search Items"),
				width: 900,
        fields:[
            {
                "fieldtype": "HTML",
                "fieldname": "items_html"
            }
        ],
        primary_action_label: 'Add Items',
        primary_action() {
            var opts = d.item_check_list.get_item();
            var me = d.item_check_list;
            var items = "";
            if(!opts.checked_items.length){
                return;
            }
            else{
                opts.checked_items.forEach((item, i) => {

                    let row = frm.add_child('items', {
                        item_code: item
                    });
                    frm.script_manager.trigger("item_code", row.doctype, row.name);
                    frm.refresh_field("items");
                });
                frm.refresh_field('items');
                frm.refresh_fields();
                frm.trigger("validate");
            }
            d.hide();
    }
    });
    d.show();
    d.get_primary_btn().attr('disabled', false);
    d.fields_dict.items_html.$wrapper.html("");
    d.$wrapper.find('.modal-content').css("width", "900px");
    d.$wrapper.find('.modal-content').css("margin-left", "-200px");
    var items_area = $('<div class="col-md-12 col-sm-12" style="min-height: 10px;">').appendTo(d.fields_dict.items_html.wrapper);
    d.item_check_list = new frappe.ItemsCheckList(items_area, frm, 0, d, new_items);
};

frappe.ItemsCheckList = Class.extend({
    init: function(wrapper, frm, disable, d, new_items) {
        var me = this;
        this.frm = frm;
        this.wrapper = wrapper;
        this.disable = disable;
        $(wrapper).html('<div class="help">' + __("Loading") + '...</div>');
        me.items = new_items;
        me.show_items(frm, d);
    },
    show_items: function(frm, d) {
        var me = this;
        var i;
        var table_row = '';
        $(this.wrapper).empty();
        var table_head = '';
        if(this.items){
            $.each(this.items, function(i, item) {
				var drug_content = item.drug_content ? item.drug_content : '';
                var item_check_field = repl('<div class="item" \
                data-item-id="%(item_id)s">\
                <input type="checkbox" class="box"> \
                </input>',
                {item_id: item.item_code});
                table_row += "<tr><td>"+item_check_field+"</td><td>"+__(item.item_code)+"</td><td>"+__(item.item_name)+"</td><td>"+drug_content+"</td><td>"+__(item.qty)+"</td><td>"+__(item.price)+"</td></tr>";
            });
        }
        var table_html = `
            <table width="100%">
                <tr>
				    <th width="5%"></th>
                    <th width="10%">Item Code</th>
					<th width="20%">Item Name</th>
                    <th width="45%">Contents</th>
                    <th width="10%">Qty</th>
                    <th width="10%">Price</th>
                </tr>
        `;
        if (table_row){
            table_html += table_row;
        }
        table_html += '</table>';
        $(me.wrapper).append(table_html);
    },
    show: function() {
        var me = this;
        // uncheck all items
        $(this.wrapper).find('input[type="checkbox"]')
            .each(function(i, checkbox) {
                checkbox.checked = false;
        });
    },
    get_item: function() {
        var checked_items = [];
        var unchecked_items = [];
        $(this.wrapper).find('[data-item-id]').each(function() {
            if($(this).find('input[type="checkbox"]:checked').length) {
                checked_items.push($(this).attr('data-item-id'));
            } else {
                unchecked_items.push($(this).attr('data-item-id'));
            }
        });
        return {
            checked_items: checked_items,
            unchecked_items: unchecked_items
        };
    }
});

function update_batch_price(frm){
    $.each(frm.doc.items || [], function(i, v) {
        var batch_no = v.batch_no;
        var item_code = v.item_code;
        var price_list = frm.doc.selling_price_list
        frappe.call({
            method: 'frappe.client.get',
            args: {
              'doctype': 'Item Price',
              'filters': {'batch_no': batch_no, 'item_code': item_code, 'price_list':price_list}
            },
            callback: function(r){
                frappe.model.set_value(v.doctype, v.name,"rate", (r.message.price_list_rate)*v.conversion_factor);
            }
        });
    });
}

function calculate_taxable_amount(frm){
		$.each(frm.doc.items || [], function(i, item) {
				var amount = parseFloat(item.amount);
				var tax_percentage = parseFloat(item.tax_percentage);
				var taxable_amount = ((amount/100)*tax_percentage);
				frappe.model.set_value(item.doctype, item.name,"taxable_amount", amount+taxable_amount);
		});
}

function remove_empty_items(frm){
		var len = frm.doc.items.length;
		if(len>0){
			if(!frm.doc.items[len-1].item_code)
	    {
				frm.get_field("items").grid.grid_rows[len-1].remove();
	    }
		}
}

function reset_cancelled_form(frm){
    if(frm.is_new()){
        if(frm.doc.bin_details){
            frm.clear_table('bin_details')
            //console.log("inside bin details")
        }
    }
}

//Code for setting ptc
frappe.ui.form.on('Sales Invoice Item', {
    item_code:function(frm,cdt,cdn){
        set_ptc(frm,cdt,cdn);
        set_rate_with_batch(frm,cdt,cdn);
    },
	batch_no:function(frm,cdt,cdn){
        set_ptc(frm,cdt,cdn);
	},
    uom:function(frm,cdt,cdn){
        set_rate_with_batch(frm,cdt,cdn);
	},
    refresh: function(frm,cdt,cdn){
        var d=locals[cdt][cdn];
        if(d.item_code && d.batch_no){
            set_ptc(frm,cdt,cdn);
            set_rate_with_batch(frm,cdt,cdn);
        }
    }
 });

function set_ptc(frm,cdt,cdn){
    var d=locals[cdt][cdn];
    frappe.call({
        "method":"frappe.client.get",
        "args":{
            "doctype":"Item Price",
            "filters":{"item_code":d.item_code,"batch_no":d.batch_no,"price_list":"Price To Customer - (PTC)"},
            "fields":["price_list_rate"]
        },
        callback:function(ret){
            if(ret){
                frappe.model.set_value(cdt,cdn,"price_to_customer",ret.message.price_list_rate);
                // frm.trigger('items', 'Sales Invoice Item', d.name);
                set_rate_with_batch(frm,cdt,cdn);
            }
        }
    });
}

function set_rate_with_batch(frm,cdt,cdn){
    var d=locals[cdt][cdn];
    frappe.call({
        "method":"frappe.client.get",
        "args":{
            "doctype":"Item Price",
            "filters":{"item_code":d.item_code,"batch_no":d.batch_no,"price_list": frm.doc.selling_price_list },
            "fields":["price_list_rate"]
        },
        callback:function(ret){
            if(ret){
                console.log(d.conversion_factor)
                console.log(ret.message.price_list_rate)
                frappe.model.set_value(cdt,cdn,"rate",(d.conversion_factor)*(ret.message.price_list_rate));
                frappe.model.set_value(cdt,cdn,"price_list_rate",(d.conversion_factor)*(ret.message.price_list_rate));
            }
        }
    });
}
