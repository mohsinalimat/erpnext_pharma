import frappe
import erpnext
from frappe import enqueue
from frappe import publish_progress
from frappe.utils import dateutils
from frappe.utils import getdate

@frappe.whitelist()
def create_item_price_without_batch(price_list):
    if price_list=="Price To Franchaisee - (PTF)":
        item_price_list = frappe.get_list("Item Price", filters={'price_list': price_list})
        count = 0
        # frappe.msgprint('Item Price updation started')
        for item_price in item_price_list:
            frappe.publish_progress(count*100/len(item_price_list), title = ("Creating Item Prices..."))
            item_price_doc = frappe.get_doc("Item Price", item_price.name)
            if not frappe.db.exists({"doctype":"Item Price", 'item_code':item_price_doc.item_code ,'price_list': price_list, 'batch_no':""}):
                new_item_price_doc = frappe.new_doc('Item Price')
                new_item_price_doc.price_list = price_list
                new_item_price_doc.item_code = item_price_doc.item_code
                new_item_price_doc.price_list_rate = item_price_doc.price_list_rate
                new_item_price_doc.insert()
                frappe.db.commit()
            count = count+1
        frappe.msgprint("Item Price Updation Completed")
        count = 0

@frappe.whitelist()
def update_item_price_from_button(price_list):
    frappe.msgprint("Enqueeddd")
    # publish_progress(percent=10, title="Reading the file")
    # frappe.show_progress('Loading..', 70, 100, 'Please wait')
    # frappe.publish_realtime("ocr_progress_bar", {"progress": [5, 10], "reload": 1}, user=frappe.session.user)
    # frappe.enqueue(create_item_price_without_batch,price_list=price_list, is_async=True, queue="short")
    # create_item_price_without_batch(price_list)
    # for i in range(1,100):
    #     print(i)
    #     frappe.publish_progress(i, title="Updating Variants...")


@frappe.whitelist()
def update_franchise_payment_request_to_new(transaction_date,company):
    franchise_payment_request_list = frappe.get_list("Franchise Payment Request", filters={'transaction_date': getdate(transaction_date), 'company':company})
    print(franchise_payment_request_list)
    print(len(franchise_payment_request_list))
    if len(franchise_payment_request_list)>1:
        new_fpr = frappe.new_doc('Franchise Payment Request')
        new_fpr.company = company
        new_fpr.transaction_date = getdate(transaction_date)
        new_fpr.total_purchase_amount = 0
        new_fpr.total_sales_amount = 0
        sum = 0
        for franchise_payment_request in franchise_payment_request_list:
            print(franchise_payment_request.name)
            franchise_payment_request_doc = frappe.get_doc("Franchise Payment Request", franchise_payment_request.name)
            sales_invoice_doc = frappe.get_doc("Sales Invoice", franchise_payment_request_doc.reference_document)
            for item in sales_invoice_doc.items:
                item_price = frappe.db.get_value('Item Price', {'item_code': item.item_code, 'price_list':'Price To Franchaisee - (PTF)'}, ['price_list_rate'])
                sum = sum + (int(item_price)*item.stock_qty)
            new_fpr.weekday = franchise_payment_request_doc.weekday
            new_fpr.notification_date = franchise_payment_request_doc.notification_date
            fpr_item = new_fpr.append('items')
            fpr_item.sales_invoice = sales_invoice_doc.name
            fpr_item.posting_date = sales_invoice_doc.posting_date
            fpr_item.sales_amount = sales_invoice_doc.outstanding_amount
            fpr_item.purchase_amount = sum
            new_fpr.total_purchase_amount = sum + new_fpr.total_purchase_amount
            new_fpr.total_sales_amount = sales_invoice_doc.outstanding_amount + new_fpr.total_sales_amount
            new_fpr.save()
            franchise_payment_request_doc.delete()
            frappe.db.commit()