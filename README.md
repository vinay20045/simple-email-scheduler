simple-email-scheduler
======================
This is an email scheduler for Gmail written using Google Apps Script. It is hosted as a web app on Google Chrome webstore. The script looks for scheduling instruction in you email's subject line, uses drafts to hold the email till it is time to send and sends the email without your intervention using apps script triggers.

You can read more about how it works [here][1]

Requirements
------------
Google Account with Access to Gmail, Google Drive and Apps Script

Working
-------
The script sets a trigger which, whenever it runs will check for all the drafts that has WISEBOT send instructions. It will then process all those drafts where it can decode the time and send them after the time has reached or according to send instructions.   

If you have installed this from the chrome store, you should see a folder called WISEBOT in your google drive which will have day wise reports of your processed mails.   

Install/Uninstall
---------------------------
**Manually**   
1. Download or clone the repo   
2. Start a project in [Google Apps Script][2]   
3. Copy all the code in Code.gs to your project (You can ignore the index.html file)   
4. [Add a new trigger manually][3]  to run ```process_jobs``` function in a schedule that suits you (30 mins recommended)
5. Simply delete the trigger and the apps script project to uninstall   

**From Chrome Store (for chrome browser)**   
1. Add the app from the [chrome web store][4]   
2. In your chrome browser, you can go to ```chrome://apps``` and click on the app icon   
3. Click the ```Install``` link in the header   
4. Follow 1, 2 and then click ```Uninstall``` link to uninstall   

**For other browsers**   
1. Go to app's [main page][5]   
2. Authorize app   
3. Click the ```Install``` link in the header   
4. Follow 1, 2 and then click ```Uninstall``` link to uninstall   

Simple Usage - Scheduling a mail to be sent later
-------------------------------------------------
1. Start composing a mail as you normally would   
2. Once you are done change your subject line to include the time you need to send the mail as shown below   
```WISEBOT---<javascript_date_string>---<your_actual_subject_line>```   
For example, if you want to send a mail with subject _How are you_ after 9 AM on 20th of September, the subject line should be...   
```WISEBOT---2017-09-20T09:00---How are you```   
3. Save the mail as draft (DO NOT Send)   

Advanced Usage - Scheduling a mail to be sent only if there is no reply from this person to a previous mail
-----------------------------------------------------------------------------------------
1. Start composing a mail as you normally would   
2. Once you are done, you need to add a base64 encoded json string to the scheduling instruction in your subject line.   
2.1 Compose the send instructions as follows
```
    {
        "send_after": "<javascript_date_string>",
        "send_condition": "IF_NO_REPLY",
        "subjects_to_check": [
            {
                "subject": "<previous_email_subject_line>",
                "sent_after": "<when_was_this_mail_sent>"
            }
        ]
    }
```
For example, let's say you want to send a follow up to the previous message 2 days later, then the instructions string should look like   
```
    {
        "send_after": "2017-09-22T09:00",
        "send_condition": "IF_NO_REPLY",
        "subjects_to_check": [
            {
                "subject": "How are you",
                "sent_after": "2017-09-20T09:00"
            }
        ]
    }
```
2.2 Encode this string to base64 (You can use browser console to do this)   
2.3 Construct your new subject line like...   
```
    WISEBOT---<base_64_encoded_send_instructions>---<Actual subject line>
```
For the above example, that is...   
```
    WISEBOT---eyJzZW5kX2FmdGVyIjogIjIwMTctMDktMjJUMDk6MDAiLCJzZW5kX2NvbmRpdGlvbiI6ICJJRl9OT19SRVBMWSIsInN1YmplY3RzX3RvX2NoZWNrIjogW3sic3ViamVjdCI6ICJIb3cgYXJlIHlvdSIsInNlbnRfYWZ0ZXIiOiAiMjAxNy0wOS0yMFQwOTowMCJ9XX0=---Just Following up
```   
3. Save the mail as draft (DO NOT Send)   


Gotchas
-------
1. The script does not send your mail at the exact time you give in the instructions. But, it will attempt to send your mail only after the scheduled time has reached and in most cases within 30 mins of that time.   
2. In case the script is not able to understand the scheduling instruction the time will be decoded as 31 December, 1969 and it will keep attempting to send it in every run until you manually delete the mail

Read More
---------
* If you want to understand all use cases this script serves in detail, go [here][1]
* If you don't want to do all this manually, we have built an awesome extension for it. [Check it out][6]



[1]: https://wisebot.io/simple-email-scheduler-for-gmail.html
[2]: https://developers.google.com/apps-script/
[3]: https://developers.google.com/apps-script/guides/triggers/installable#managing_triggers_manually
[4]: https://chrome.google.com/webstore/detail/simple-email-scheduler/nbmpdhdjogfaoghpjdldfnlbbgpjohbj/
[5]: https://script.google.com/macros/s/AKfycbzlhN8C66VR_JfGd_jYK9EhGNyaDTODjK2fnhHAgU1yE2B_MYo/exec
[6]: https://wisebot.io/
