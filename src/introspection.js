import { fetchPath, getUrlByVersion, getResourceKind } from './api'
import { memoize } from './utils'
import _ from 'lodash'

export const copyResource = resource => {
  return getKindSpec(resource.kind).then(spec => getObjectWithoutRO(resource, spec))
}

export const getKindSpec = memoize(kind => {
  return getResourceKind(kind)
    .then(resource => {
      return getApiSpec(resource.apiVersion).then(apiSpec => {
        let prefix = resource.apiVersion.split('/').slice(-1)[0]
        let modelName = prefix + '.' + kind
        let model = apiSpec.models[modelName]
        cleanModel(model, apiSpec.models)
        return model
      })
    })
})

export const getApiSpec = memoize(apiVersion => {
  return fetchPath('swaggerapi/' + getUrlByVersion(apiVersion))
})

function cleanModel(model, models) {
  for (let prop of Object.values(model.properties)) {
    if (typeof prop.$ref == 'string') {
      prop.$ref = models[prop.$ref]
      cleanModel(prop.$ref, models)
    }

    if (prop.description && prop.description.indexOf('Read-only.') != -1) {
      prop.readOnly = true
    }
  }

  if (model.properties.kind && model.properties.status) {
    model.properties.status.readOnly = true
  }
}

function getObjectWithoutRO(obj, spec) {
  if (!spec.properties) return obj

  return Object.keys(obj).reduce((cleanedObj, propName) => {
    let propSpec = spec.properties[propName]
    if (propSpec && !propSpec.readOnly) {
      cleanedObj[propName] = getObjectWithoutRO(obj[propName], propSpec.$ref || propSpec)
    }
    return cleanedObj
  }, {})
}
