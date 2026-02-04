export function setVal<T, K extends keyof T>(obj: Partial<T>, key: K, val: T[K]) {
    obj[key] = val;
}