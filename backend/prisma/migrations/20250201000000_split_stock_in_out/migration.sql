-- Memecah StockMovement menjadi StockIn & StockOut, mengganti MarketplaceOrderDaily menjadi DailyOrder,
-- dan menghapus kolom Consumable yang kini dihitung otomatis. Data lama dipindahkan (tidak hilang).

-- CreateTable
CREATE TABLE `StockIn` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `poNumber` VARCHAR(80) NULL,
    `consumableId` INTEGER NOT NULL,
    `qty` INTEGER NOT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StockIn_consumableId_date_idx`(`consumableId`, `date`),
    INDEX `StockIn_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockOut` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `consumableId` INTEGER NOT NULL,
    `qty` INTEGER NOT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StockOut_consumableId_date_idx`(`consumableId`, `date`),
    INDEX `StockOut_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyOrder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `totalOrders` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DailyOrder_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Pindahkan data lama (nama = referensi lama; no PO kosong untuk data lama)
INSERT INTO `StockIn` (`id`, `date`, `name`, `consumableId`, `qty`, `createdById`, `createdAt`, `updatedAt`)
SELECT `id`, `date`, `reference`, `consumableId`, `qty`, `createdById`, `createdAt`, `updatedAt`
FROM `StockMovement` WHERE `type` = 'IN';

INSERT INTO `StockOut` (`id`, `date`, `name`, `consumableId`, `qty`, `createdById`, `createdAt`, `updatedAt`)
SELECT `id`, `date`, `reference`, `consumableId`, `qty`, `createdById`, `createdAt`, `updatedAt`
FROM `StockMovement` WHERE `type` = 'OUT';

INSERT INTO `DailyOrder` (`id`, `date`, `totalOrders`, `createdAt`, `updatedAt`)
SELECT `id`, `date`, `totalOrders`, `createdAt`, `updatedAt`
FROM `MarketplaceOrderDaily` WHERE `source` = 'SHOPEE';

-- AddForeignKey
ALTER TABLE `StockIn` ADD CONSTRAINT `StockIn_consumableId_fkey` FOREIGN KEY (`consumableId`) REFERENCES `Consumable`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockIn` ADD CONSTRAINT `StockIn_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOut` ADD CONSTRAINT `StockOut_consumableId_fkey` FOREIGN KEY (`consumableId`) REFERENCES `Consumable`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOut` ADD CONSTRAINT `StockOut_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Hapus tabel lama
DROP TABLE `StockMovement`;
DROP TABLE `MarketplaceOrderDaily`;

-- Kolom yang kini dihitung otomatis di Monitoring
ALTER TABLE `Consumable` DROP COLUMN `minimumStock`, DROP COLUMN `leadTimeDays`, DROP COLUMN `orderPoint`, DROP COLUMN `safetyStock`;
