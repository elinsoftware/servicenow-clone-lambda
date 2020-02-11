const randomUUIDGenerator = require('uuid/v4')

exports.handler = (event, context, callback) => {
   console.log(event.httpMethod)
   console.log(JSON.stringify(event.body))
   if (event.httpMethod === 'OPTIONS') {
      callback(null, withCors({ statusCode: 200 }))
   }

   const requestBody = JSON.parse(event.body)
   const { fileContents, appScope, appName } = requestBody

   let clonedAppContents
   try {
      clonedAppContents = cloneApp(fileContents, appScope, appName)
   } catch (err) {
      callback(err)
   }

   const response = {
      statusCode: 200,
      body: clonedAppContents,
   }
   return callback(null, withCors(response))
}


function withCors(responseObj) {
   const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Accept, Referrer, User-Agent, accept-encoding, accept-language, content-length, origin, referer, sec-fetch-mode, sec-fetch-site',
      }
   return {...responseObj, headers: { ...responseObj.headers, ...corsHeaders }}
}

function cloneApp(
   fileContents = '',
   newAppScope = 'x_elsr',
   newAppName = 'ElinSoftwareApp'
) {
   const clonedApp = MainTreadRun(fileContents, newAppScope, newAppName)
   return clonedApp
}

function MainTreadRun(data, newAppScope, newAppName) {
   const oldSysIds = getCurrentSysIds(data)
   const newSysIds = generateRandomSysIds(oldSysIds.length)

   //iterate through existing sys_ids and replace sys_id
   let newData = data
   for (let i = 0; i < oldSysIds.length; i++) {
      const re = new RegExp(oldSysIds[i], 'g')
      newData = newData.replace(re, newSysIds[i])
   }

   // --------------------------- all sys_id replaced by here --------------------

   // replace app scope
   const appScopeIndex = newData.indexOf('<application_scope>') + 19
   const appScopeIndexEnd = newData.indexOf('</application_scope>')
   const appScope = newData.substring(appScopeIndex, appScopeIndexEnd)

   const regScope = new RegExp(appScope, 'g')
   newData = newData.replace(regScope, newAppScope)
   

   // replace app name
   const regexName = /<application display_value="(.*?)"/g
   const appNameOrig = regexName.exec(newData)
   const nameStrToReplace = appNameOrig[1]
   const nameStrNEW = newAppName
   const regexNewName = new RegExp(nameStrToReplace, 'g')
   newData = newData.replace(regexNewName, nameStrNEW)

   const idOriginal = []
   const idNew = []

   //!!!!!!!! correct loop through all occurences
   // regex to find all occurences of <id>..</id> https://regex101.com/
   let regex = /<id>.*?<\/id>/g
   let result
   while ((result = regex.exec(newData))) {
      idNew.push(
         result[0].substring(0, result[0].length - 5) + newAppScope + '</id>'
      )
      idOriginal.push(result[0])
   }

   // regex to find all occurences of escaped ID
   regex = /&lt;id&gt;.*?&lt;\/id&gt;/g
   while ((result = regex.exec(newData))) {
      idNew.push(
         result[0].substring(0, result[0].length - 11) +
            newAppScope +
            '&lt;/id&gt;'
      )
      idOriginal.push(result[0])
   }

   //regex to find all occurences of url_suffix
   regex = /<url_suffix>.*?<\/url_suffix>/g
   while ((result = regex.exec(newData))) {
      idNew.push(
         result[0].substring(0, result[0].length - 13) +
            newAppScope +
            '</url_suffix>'
      )
      idOriginal.push(result[0])
   }

   //regex to find all image names
   regex = /<name>.*?<\/name><size_bytes/g
   while ((result = regex.exec(newData))) {
      idNew.push(
         '<name>' + newAppScope + result[0].substring(6, result[0].length)
      )
      idOriginal.push(result[0])
   }

   //iterate through IDs and replace sys_id
   for (let i = 0; i < idOriginal.length; i++) {
      const re = new RegExp(idOriginal[i], 'g')
      newData = newData.replace(re, idNew[i])
   }

   return newData
}

function getCurrentSysIds(data) {
   //find all occurrences of <sys_id>
   const regex = /<sys_id>/gi
   let result
   const indices = []
   while ((result = regex.exec(data))) {
      indices.push(result.index)
   }

   //find all occurrences of &lt;sys_id&gt;
   const reg_sysid = new RegExp('&lt;sys_id&gt;', 'g')
   while ((result = reg_sysid.exec(data))) {
      indices.push(result.index + 6)
   }

   //build an array of the existing sys_id's to replace
   const oldSysIds = []
   for (let k = 0; k < indices.length; k++) {
      oldSysIds.push(data.substring(indices[k] + 8, indices[k] + 40))
   }

   // push application sys_id
   const app_sys_id = data.indexOf('</application>')
   oldSysIds.push(data.substring(app_sys_id - 32, app_sys_id))

   return oldSysIds
}

/**
 * Generate an array of random UUIDs in the
 * ServiceNow format.
 *
 * @param {*} number
 */
function generateRandomSysIds(number) {
   if (number > Number.MAX_SAFE_INTEGER) throw 'Number is too large.'
   if (number < 1) throw 'Number has to be larger than 0'
   const list = []
   for (let i = 0; i < number; i++) {
      list.push(randomUUIDGenerator().replace(/-/g, ''))
   }
   return list
}
