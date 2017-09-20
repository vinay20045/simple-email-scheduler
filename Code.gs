/**********

  Simple Email Scheduler by Wisebot.io
  ------------------------------------
  This add-on checks for scheduling instructions in your draft mails and processes 
  the draft to send the mail in the required time window.

  NOTES:
  * User's default time zone is assumed to interpret datetime strings

  TRIGGERS:
  1. process_jobs - every 30 minutes - This will process all drafts mails as instructed.
  
***********/

var message_retry_max_hours = 50; //Message will be not be sent if 50 hours has passed since it has been scheduled.
var execution_start = new Date();

var WISEBOT = 'WISEBOT';
var WISEBOT_FOLDER = 'WISEBOT_FOLDER';
var IF_NO_REPLY = 'if_no_reply';
var NO_CONDITION = 'no_condition';
var SUBJECTS_TO_CHECK = 'subjects_to_check';
var SUBJECT = 'subject';
var SEND_AFTER = 'send_after';
var SENT_AFTER = 'sent_after';
var SEND_CONDITION = 'send_condition';
var PROCESS_JOBS_TRIGGER = 'process_jobs_trigger';
var SENT = 'sent';
var NOT_SENT = 'not_sent';
var PENDING = 'pending';
var GOOGLE_SPREADSHEET = 'application/vnd.google-apps.spreadsheet';
var INSTALL = 'install';
var UNINSTALL = 'uninstall';
var SUCCESS_REASON_GENERIC = 'All conditions satisfied';
var FAILURE_REASON_GENERIC = 'Could not understand instructions';
var FAILURE_REASON_SEND_WINDOW = 'Could not be sent within ' + message_retry_max_hours + ' hours from scheduled time';
var FAILURE_REASON_REPLY_DETECTED = 'Reply detected';
var FAILURE_REASON_API = 'Some API/quota issue';
var FAILURE_REASON_NOT_YET_TIME = 'Schedued time not reached yet';

var SUBJECT_DELIMITER = '---';
var IMAGE_DELIMITER = '$';


function __delete_trigger__(){
  var user_preferences = PropertiesService.getUserProperties();
  var triggers = ScriptApp.getProjectTriggers();
  for(var i=0; i<triggers.length; i++){
    if(user_preferences.getProperty(PROCESS_JOBS_TRIGGER) == triggers[i].getUniqueId()){
      ScriptApp.deleteTrigger(triggers[i]);
      user_preferences.deleteProperty(PROCESS_JOBS_TRIGGER);
      break;
    }
  }
  
  //cleaning up in case of manual uninstallation of triggers
  if(user_preferences.getProperty(PROCESS_JOBS_TRIGGER)){
     user_preferences.deleteProperty(PROCESS_JOBS_TRIGGER);
  }
}


function __set_trigger__(){
  var user_preferences = PropertiesService.getUserProperties();
  if(!user_preferences.getProperty(PROCESS_JOBS_TRIGGER)){
     var trigger = ScriptApp.newTrigger('process_jobs')
       .timeBased()
       .everyMinutes(30)
       .create()
     ;
    user_preferences.setProperty(PROCESS_JOBS_TRIGGER, trigger.getUniqueId());
  }
}


function __delete_folder__(){
  var user_preferences = PropertiesService.getUserProperties();
  if(user_preferences.getProperty(WISEBOT_FOLDER)){
    Drive.Files.remove(user_preferences.getProperty(WISEBOT_FOLDER));
    user_preferences.deleteProperty(WISEBOT_FOLDER);
  }
}


function __create_folder__(){
  var user_preferences = PropertiesService.getUserProperties();
  if(!user_preferences.getProperty(WISEBOT_FOLDER)){
    var folder = DriveApp.createFolder(WISEBOT);
    user_preferences.setProperty(WISEBOT_FOLDER, folder.getId());
  }
}


function __date_to_string__(x, no_time){
  no_time = no_time || false;
  x = x || execution_start;
  
  var date_string = x.getFullYear() 
    + '-' + ('0' + x.getMonth()).slice(-2)
    + '-' + ('0' + x.getDate()).slice(-2) 
  ;
  if(!no_time){
    date_string = date_string 
      + 'T' + ('0' + x.getHours()).slice(-2) 
      + ':' + ('0' + x.getMinutes()).slice(-2)
    ;
  }
  
  return date_string;
}


function __string_to_date__(x){
  return new Date(x);
}


function __record_execution_log__(to, subject, status, reason, send_instructions){
  var header_row = null;
  var user_preferences = PropertiesService.getUserProperties();
  var folder = DriveApp.getFolderById(user_preferences.getProperty(WISEBOT_FOLDER));
  var file_name = WISEBOT + '-' + __date_to_string__(execution_start, true)
  
  var report_file = folder.getFilesByName(file_name);
  if(report_file.hasNext()){
    report_file = report_file.next();
    var sheet = SpreadsheetApp.open(report_file).getActiveSheet();
  }
  else{
    report_file = {
      parents: [{id: user_preferences.getProperty(WISEBOT_FOLDER)}],
      title: file_name,
      mimeType: GOOGLE_SPREADSHEET
    }
    
    header_row = [
      'email_id', 
      'subject', 
      'scheduled_on', 
      'send_condition', 
      'status', 
      'reason', 
      'processed_on'
    ];
    
    report_file = Drive.Files.insert(report_file);
    var sheet = SpreadsheetApp.openById(report_file.id).getActiveSheet();
  }

  if(folder){ //why? consider removing...
    if(header_row){
      sheet.appendRow(header_row);
    }
    
    sheet.appendRow([
      to, 
      subject, 
      send_instructions[SEND_AFTER],
      send_instructions[SEND_CONDITION],      
      status, 
      reason, 
      execution_start
    ]);
  }
}


function __send_condition_check__(send_instructions, message){
  var send_condition = send_instructions[SEND_CONDITION];
  var send_mail = true;

  if(send_condition == NO_CONDITION){
    send_mail = true;
  }
  else if(send_condition == IF_NO_REPLY){
    var new_to = message.getTo().split(',');
    var from_addresses_to_check = '{';
    for(var i=0; i<new_to.length; i++){
      from_addresses_to_check + 'from:' + new_to[i] + ' ';
    }
    from_addresses_to_check = from_addresses_to_check.trim() + '}';
    
    for(var i=0; i<send_instructions[SUBJECTS_TO_CHECK].length; i++){
      var subject_to_check = send_instructions[SUBJECTS_TO_CHECK][i];
      subject_to_check[SUBJECT] = subject_to_check[SUBJECT].replace(/^(Re|Fwd|Fw)[: ]*\b/ig, '') //:(
      var required_date_epoch = Math.floor(new Date(subject_to_check[SENT_AFTER])/1000);
      var send_condition_check = 'in:inbox '
        + from_addresses_to_check
        + ' subject:"' 
        + subject_to_check[SUBJECT]
        + '" after:' 
        + required_date_epoch
      ;

      var threads = GmailApp.search(send_condition_check);
      if(threads.length){
        send_mail = false;
        break;
      }
    }
  }

  return send_mail;
}


function __process_draft_message__(message, subject, no_send){
  var return_value = null;
  no_send = no_send || false;
  var attachments = message.getAttachments();
  var inline_images = {};
  var msg_attachments = [];
  
  for(var i=0; i<attachments.length; i++){
    var attachment_name = attachments[i].getName();
    var name_parts = attachment_name.split(IMAGE_DELIMITER);

    if(name_parts[0] == WISEBOT){
      inline_images[attachment_name] = attachments[i].getAs(attachments[i].getContentType());
    }
    else{
      msg_attachments.push(attachments[i])
    }
  }
  
  if(no_send){
    var new_draft = message.getRawContent();
    new_draft = new_draft.replace(
      subject[0] + SUBJECT_DELIMITER + subject[1] + SUBJECT_DELIMITER, 
      ''
    );
    new_draft = Utilities.base64EncodeWebSafe(new_draft);
    return_value = Gmail.Users.Drafts.create({"message": {"raw": new_draft}}, 'me');
  }
  else{
    return_value = message.forward(message.getTo(), {
      cc: message.getCc(),
      bcc: message.getBcc(),
      from: message.getFrom(),
      subject: subject[2],
      htmlBody: message.getBody(),
      inlineImages: inline_images,
      attachments: msg_attachments
    });
  }

  Gmail.Users.Messages.remove('me', message.getId());
  return return_value;
}


function __decode_instructions__(instructions){
  var send_instructions = {};
  try{
    send_instructions = Utilities.base64Decode(instructions);
    send_instructions = JSON.parse(Utilities.newBlob(send_instructions).getDataAsString());
    send_instructions[SEND_AFTER] = __string_to_date__(send_instructions[SEND_AFTER]);
  }
  catch(e){
    try{
      send_instructions[SEND_AFTER] = __string_to_date__(instructions);
    }
    catch(e){
      send_instructions[SEND_AFTER] = false;
    }
    
    send_instructions[SEND_CONDITION] = NO_CONDITION;
    send_instructions[SUBJECTS_TO_CHECK] = [];
  }
  
  return send_instructions;
}


function process_jobs(){
  var drafts = GmailApp.getDraftMessages();
  
  for(var i=0; i<drafts.length; i++){
    var message = drafts[i];
    var subject = message.getSubject();
    subject = subject.split(SUBJECT_DELIMITER);
    if(subject[0] == WISEBOT){
      var send_instructions = __decode_instructions__(subject[1]);
      var status = null;
      var status_reason = '';
 
      if(send_instructions[SEND_AFTER] != false){
        var send_window_end = new Date(send_instructions[SEND_AFTER]);
        send_window_end.setHours(send_window_end.getHours() + message_retry_max_hours);
        if(send_instructions[SEND_AFTER] <= execution_start){
          if(execution_start <= send_window_end){
            if(__send_condition_check__(send_instructions, message)){
              if(__process_draft_message__(message, subject)){
                status = SENT;
                status_reason = SUCCESS_REASON_GENERIC;
              }
              else{
                status = PENDING
                status_reason = FAILURE_REASON_API;
              }
            }
            else{
              __process_draft_message__(message, subject, true);
              status = NOT_SENT;
              status_reason = FAILURE_REASON_REPLY_DETECTED;
            }
          }
          else{
            __process_draft_message__(message, subject, true);
            status = NOT_SENT;
            status_reason = FAILURE_REASON_SEND_WINDOW;
          }
        }
        else{
          status = PENDING;
          status_reason = FAILURE_REASON_NOT_YET_TIME;
        }
      }
      else{
        __process_draft_message__(message, subject, true);
        status = NOT_SENT;
        status_reason = FAILURE_REASON_GENERIC;
      }
      
      try{
        if(status != null){
          __record_execution_log__(
            message.getTo(), 
            subject[2], 
            status, 
            status_reason,
            send_instructions
          );
        }
      }
      catch(e){
        //folder not available. Do something here...
      }
    }
  }
}


function doGet(e){
  var output = '';
  
  if(e.parameter[INSTALL] == 1){
    __set_trigger__();
    __create_folder__();
    var reply = '<center><br><br>Wisebot Email Scheduler trigger(s) <b>installed successfully</b>.<br>Please close this tab/window to continue.</center>';
    output = HtmlService.createHtmlOutput(reply);
  }
  else if(e.parameter[UNINSTALL] == 1){
    __delete_trigger__();
    __delete_folder__();
    var reply = '<center><br><br>Wisebot Email Scheduler trigger(s) <b>uninstalled successfully</b>.<br> Please close this tab/window to continue</center>.';
    output = HtmlService.createHtmlOutput(reply);
  }
  else{
    output = HtmlService.createHtmlOutputFromFile('index');
  }
  
  return output;
}