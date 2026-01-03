export const getRandom = (upper = 100) => {
    return Math.floor(Math.random() * upper);
};

const getVillagerNumber = () => {
    return getRandom(10) + 1;
};

const getWolfNumber = (vil_number) => {
    let number = vil_number;
    switch(vil_number)
    {
        case 1:
            number = vil_number + 1;
            break;
        case 10:
            number = vil_number - 1;
            break;
        default:
            const temp = getRandom(2);
            if(temp == 0) number = vil_number - 1;
            else number = vil_number + 1;
            break;
    }

    return number;
}

export const getVilWolfNumber = () => {
    const vil_number = getVillagerNumber();
    const wolf_number = getWolfNumber(vil_number);

    return [vil_number, wolf_number];
}

const CARD_TYPE_LIST = [
    "クリーチャー",
    "呪文",
    "なんでも可"
]

const CARD_ABILITY_LIST = [
    "ドロー",
    "マナ加速",
    "システム",
    "テンポロス(ハンデスでもランデスでも)",
    "除去(バウンスでも破壊でも)",
    "シールドトリガー",
    "G・ゼロ",
    "なんでも可"
]

const CARD_COLOR_LIST = [
    "火",
    "水",
    "自然",
    "光",
    "闇",
    "ゼロ",
    "なんでも可"
]

export const getCardType = () => {
    const index = getRandom(CARD_TYPE_LIST.length);
    return CARD_TYPE_LIST[index];
}

export const getCardAbility = () => {
    const index = getRandom(CARD_ABILITY_LIST.length);
    return CARD_ABILITY_LIST[index];
}

export const getCardColor = () => {
    const index = getRandom(CARD_COLOR_LIST.length);
    return CARD_COLOR_LIST[index];
}
