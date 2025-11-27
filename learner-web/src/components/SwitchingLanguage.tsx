import React, { useState } from 'react'
import { NativeSelect, NativeSelectOption } from './ui/native-select'
import i18next from "i18next";
const SwitchingLanguage = () => {
    const [lang, setLang] = useState(localStorage.getItem('lang') || 'vi')
    const handleChangeLanguage = (value: string) => {
        i18next.changeLanguage(value)
        localStorage.setItem('lang', value)
        setLang(value)
        // window.location.reload();
    }
    return (
        <div>
            <NativeSelect  onChange={(e) => handleChangeLanguage(e.target.value)} value={lang}>
                <NativeSelectOption value="vi">🇻🇳 Vietnamese</NativeSelectOption>
                <NativeSelectOption value="en">🇬🇧 English</NativeSelectOption>
            </NativeSelect>
        </div>
    )
}

export default SwitchingLanguage