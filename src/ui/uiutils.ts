export function setObjectProperty(obj: Object, propertyName: string, value: any) {
    if (propertyName in obj) {
        obj[propertyName] = value
    } else {
        const setterName = `set${propertyName.charAt(0).toUpperCase()}${propertyName.slice(1)}`
        if (typeof obj[setterName] === 'function') {
            obj[setterName](value)
        }
        else {
            console.log('prop not found', setterName)
        }
    }
}

export function getObjectProperty(obj: Object, propertyName: string): any {
    if (propertyName in obj) {
        return obj[propertyName]
    } else {
        const getterName = `get${propertyName.charAt(0).toUpperCase()}${propertyName.slice(1)}`
        if (typeof obj[getterName] === 'function') {
            return obj[getterName]()
        }
        else {
            console.error('prop not found', getterName)
        }
    }
    return null
}

// Utility function to determine equality for different types including arrays
export function isEqual(value1: any, value2: any): boolean {
    if (Array.isArray(value1) && Array.isArray(value2)) {
        if (value1.length !== value2.length) return false
        return value1.every((element, index) => isEqual(element, value2[index]))
    } else if (typeof value1 === "object" && typeof value2 === "object") {
        return JSON.stringify(value1) === JSON.stringify(value2)
    } else {
        return value1 === value2
    }
}