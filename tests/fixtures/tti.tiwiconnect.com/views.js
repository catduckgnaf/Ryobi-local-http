var TcViews = (function() {
  return [{
      "menuLvl": 3,
      "menu": false,
      "role": ["site_admin"],
      "viewId": "about",
      "templateUrl": "partials/tcapp-about.html",
      "viewTitle": "About",
      "viewRoute": "/about"
    },
    {
      "menuLvl": 3,
      "menu": false,
      "role": ["public", "site_admin", "site_user"],
      "viewId": "passreset",
      "templateUrl": "partials/tcapp-password-reset.html",
      "viewTitle": "Password Reset",
      "viewRoute": "/passreset/:hash"
    },
    {
      "menuLvl": 1,
      "menu": false,
      "role": ["public"],
      "templateUrl": "partials/tcapp-login.html",
      "viewId": "login",
      "viewRoute": "/login",
      "viewTitle": "Log In",
      "contentStrings": {
        "legendLabel1": "Register for a new account",
        "legendLabel2": "I already have an account",
        "formLabel2": "Password",
        "formLabel4": "Email or Username",
        "formLabel5": "Password",
        "formLabel6": "Remember Me",
        "formSubmit2": "Sign in Now"
      }
    },
    {
      "menuLvl": 1,
      "menu": false,
      "role": ["public"],
      "templateUrl": "partials/tcapp-home.html",
      "viewId": "home",
      "viewRoute": "/home",
      "viewTitle": "Home",
      "contentStrings": {
        "content": "<p>intro to Tiwi Connect!</p>",
        "devices_summary": "We are the only company today that offers all three components needed for an end-to-end solution from a single source.",
        "home_heroSub": "Monitoring, Control and Alerts for Embedded Devices",
        "home_heroTitle": "Intelligent Wireless Connectivity",
        "learn_more_btn": "See How It Works",
        "learn_more_summary": "LS Research has developed TiWiConnect, the total connectivity platform that allows companies to integrate intelligent wireless connectivity into their products more easily, quickly and cost-effectively than ever before.",
        "sign_up_extended": "Sign Up",
        "title": "TiWiConnect Home Page",
        "devices_summary_bullet1": "Embedded wireless modules and device software",
        "devices_summary_bullet2": "Flexible cloud server software",
        "devices_summary_bullet3": "Design and integration of mobile applications"
      }
    },
    {
      "menuLvl": 1,
      "menu": true,
      "role": ["site_admin", "super_user"],
      "templateUrl": "partials/tcapp-alerts.html",
      "viewId": "alerts",
      "viewRoute": "/alerts",
      "viewTitle": "Alerts",
      "contentStrings": {
        "tab3": "Unqueued Alerts",
        "tab2": "Alert Triggers",
        "tab1": "Queued Alerts",
        "buttonLabel3": "Create A Trigger",
        "buttonLabel2": "Get More",
        "buttonLabelSearch": "Submit",
        "buttonLabel1": "Unqueue All",
        "buttonLabel4": "Delete All",
        "buttonLabel5": "Sort By",
        "fieldLabel1": "Queued",
        "buttonLabel6": "Group By",
        "fieldLabel2": "Queued",
        "fieldLabel3": "Trigger Name",
        "fieldLabel4": "Log Detail",
        "fieldLabel5": "Time Stamp",
        "fieldLabel6": "Delete Message",
        "fieldLabel7": "Logging",
        "fieldLabel8": "Target",
        "fieldLabel9": "Code",
        "fieldLabel10": "Edit",
        "fieldLabel11": "Alerts",
        "fieldLabel12": "Subscribe",
        "deleteMessage": "Are you sure you want to delete this trigger?",
        "deleteTitle": "Confirm Trigger Delete"
      }
    },
    {
      "menuLvl": 1,
      "menu": true,
      "role": ["site_admin", "super_user"],
      "templateUrl": "partials/tcapp-userdetails.html",
      "viewId": "details",
      "viewRoute": "/my-account",
      "viewTitle": "Account",
      "contentStrings": {
        "formLabel11": "Password",
        "formSubmitLabel": "Save",
        "formLabel1": "First Name",
        "formLabel2": "Last Name",
        "formLabel3": "Company Name",
        "formLabel4": "Email for Alerts",
        "formLabel5": "Phone Number for Alerts",
        "formLabel6": "Receive Email Alerts",
        "formLabel7": "Receive Email Updates",
        "formLabel8": "Receive SMS Alerts",
        "formLabel9": "Email Address",
        "formLabel10": "Username",
        "formlabel11": "Password",
        "formButtonLabel1": "Change Now"
      }
    },
    {
      "menuLvl": 3,
      "menu": false,
      "role": ["site_admin", "super_user"],
      "viewId": "contact",
      "templateUrl": "partials/tcapp-view",
      "viewTitle": "Contact",
      "viewRoute": "/contact"
    },
    {
      "menuLvl": 1,
      "role": ["site_admin", "super_user"],
      "viewId": "gdo",
      "viewTitle": "GDO",
      "viewRoute": "/gdo/:endnodeid",
      "templateUrl": "partials/tti-gdo.html",
      "menu": false,
      "contentStrings": {}
    },
    {
      "menuLvl": 1,
      "role": ["site_admin", "super_user"],
      "viewId": "endnode",
      "viewTitle": "Endnode",
      "viewRoute": "/endnode/:endnodeid",
      "templateUrl": "partials/tcapp-endnode.html",
      "menu": false,
      "contentStrings": {
        "buttonLabel5": "Limit",
        "fieldLabel11": "Value",
        "fieldLabel10": "Action",
        "fieldLabel9": "Modify",
        "fieldLabel8": "Type",
        "fieldLabel7": "Value",
        "fieldLabel6": "Attribute",
        "fieldLabel5": "Description",
        "fieldLabel4": "Model",
        "fieldLabel3": "Manufacturer",
        "fieldLabel2": "Location",
        "fieldLabel1": "Name",
        "legendLabel3": "Device Actions",
        "legendLabel2": "Device Attributes",
        "legendLabel1": "Device Details",
        "legendLabel4": "Widgets",
        "legendLabel5": "Limit"
      }
    },
    {
      "menuLvl": 1,
      "menu": true,
      "role": ["site_admin", "super_user"],
      "templateUrl": "partials/tti-endnodes.html",
      "viewId": "endnodes",
      "viewRoute": "/endnodes",
      "viewTitle": "Devices",
      "contentStrings": {
        "fieldLabel5": "Added",
        "fieldLabel4": "Last Seen",
        "formLegend1": "My Devices",
        "formLegend2": "Add a Device",
        "idLabel": "Device ID #",
        "pinLabel": "Device Pin #",
        "buttonLabel": "Add Device",
        "fieldLabel1": "Device Name",
        "fieldLabel2": "Location",
        "fieldLabel3": "Type",
        "actionLabel1": "View",
        "actionLabel2": "Edit",
        "formLegend": "My Devices"
      }
    }
  ];
}());