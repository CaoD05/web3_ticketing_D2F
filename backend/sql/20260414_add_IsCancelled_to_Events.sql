USE [EventTicketDB]
GO

IF COL_LENGTH('dbo.Events', 'IsCancelled') IS NULL
BEGIN
    ALTER TABLE [dbo].[Events]
    ADD [IsCancelled] [bit] NOT NULL
        CONSTRAINT [DF_Events_IsCancelled] DEFAULT (0)
        WITH VALUES;
END
GO

UPDATE [dbo].[Events]
SET [IsCancelled] = 1
WHERE [IsCancelled] = 0
  AND CHARINDEX('[cancelled:true]', ISNULL([Description], '')) > 0;
GO
