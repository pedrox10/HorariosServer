import {BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Terminal} from "./Terminal";

@Entity()
export class Marcacion extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    ci: number
    @Column({type: 'date', nullable: true})
    fecha: Date;
    @Column({type: 'time', nullable: true})
    hora: Date;
    @ManyToOne(() => Terminal, (terminal) => terminal.marcaciones)
    terminal: Terminal
}